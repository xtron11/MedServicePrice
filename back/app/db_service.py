from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from back.app.models import (
    Clinic, ClinicBranch, Price, RawPrice,
    ServiceCatalog, ServiceCategory, UnmatchedQueue,
    ParserLog, PriceHistory,
)

from rapidfuzz import process, utils


# ─── Нормализация ─────────────────────────────────────────────────────────────

def normalize_service(session: Session, raw_name: str, category) -> tuple:
    """
    Ищет совпадение в справочнике по категории.
    category может быть строкой "doctor" или ServiceCategory.doctor — оба варианта работают.
    """
    # Приводим к строке на случай если передали Enum-объект
    cat_str = category.value if hasattr(category, "value") else str(category)

    catalog_items = session.execute(
        select(ServiceCatalog).where(ServiceCatalog.category == cat_str)
    ).scalars().all()

    if not catalog_items:
        return None, None

    # Строим индекс: id → название + синонимы
    choices = {}
    for item in catalog_items:
        choices[str(item.id)] = item.name
        if item.synonyms:
            for syn in item.synonyms.split(","):
                syn = syn.strip()
                if syn:
                    choices[f"{item.id}_syn_{syn}"] = syn

    # Для врачей используем более мягкий порог — ФИО в названии сильно снижает score
    cutoff = 75 if cat_str == "doctor" else 90

    result = process.extractOne(
        raw_name,
        choices,
        processor=utils.default_process,
        score_cutoff=cutoff,
    )

    if result:
        matched_key = str(result[2])
        actual_id = matched_key.split("_syn_")[0]
        catalog_item = session.get(ServiceCatalog, actual_id)
        if catalog_item:
            return catalog_item.id, catalog_item.name

    return None, None


# ─── История цен ──────────────────────────────────────────────────────────────

def update_price_history(session: Session, price: Price) -> None:
    """
    Записывает точку истории только если цена изменилась.
    Удаляет записи старше 30 дней.
    """
    last = session.execute(
        select(PriceHistory)
        .where(PriceHistory.price_id == price.id)
        .order_by(PriceHistory.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if last is None or last.price_kzt != price.price_kzt:
        session.add(PriceHistory(
            price_id   = price.id,
            clinic_id  = price.clinic_id,
            service_id = price.service_id,
            price_kzt  = price.price_kzt,
        ))

    # Чистим старые записи
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    session.execute(
        delete(PriceHistory).where(
            PriceHistory.price_id    == price.id,
            PriceHistory.recorded_at <  cutoff,
        )
    )


# ─── Сохранение данных ────────────────────────────────────────────────────────

def save_parsed_data(session: Session, items: list[dict], clinic_info: dict, source_url: str):
    if not items:
        return

    clinic = session.execute(
        select(Clinic).where(
            Clinic.name == clinic_info["name"],
            Clinic.city == clinic_info["city"],
        )
    ).scalar_one_or_none()

    if not clinic:
        clinic = Clinic(
            name=clinic_info["name"],
            city=clinic_info["city"],
            source_url=source_url,
        )
        session.add(clinic)
        session.flush()

    for item in items:
        # ── 1. RAW слой ───────────────────────────────────────────────────────
        session.add(RawPrice(
            clinic_name_raw  = f"{clinic.name} ({clinic.city})",
            service_name_raw = item["title"],
            price_raw        = str(item["price"]),
            currency_raw     = "KZT",
            source_url       = source_url,
        ))

        # ── 2. Нормализация ───────────────────────────────────────────────────
        # Получаем строку категории в любом случае
        cat_raw = item.get("category_enum", ServiceCategory.laboratory)
        cat_str = cat_raw.value if hasattr(cat_raw, "value") else str(cat_raw)

        service_id, norm_name = normalize_service(session, item["title"], cat_str)

        if not service_id:
            exists = session.execute(
                select(UnmatchedQueue)
                .where(UnmatchedQueue.service_name_raw == item["title"])
            ).scalar_one_or_none()
            if not exists:
                session.add(UnmatchedQueue(
                    service_name_raw = item["title"],
                    source_url       = source_url,
                    clinic_name      = clinic.name,
                ))

        # ── 3. Price слой ─────────────────────────────────────────────────────
        existing = session.execute(
            select(Price).where(
                Price.clinic_id        == clinic.id,
                Price.service_name_raw == item["title"],
            )
        ).scalar_one_or_none()

        if existing:
            existing.price_kzt        = item["price"]
            existing.service_id       = service_id
            existing.service_name_norm= norm_name
            existing.category         = cat_str   # строка, не объект
            existing.parsed_at        = datetime.now(timezone.utc)
            existing.is_active        = True
            if "duration_days" in item:
                existing.duration_days = item["duration_days"]
            session.flush()
            update_price_history(session, existing)

        else:
            new_price = Price(
                clinic_id        = clinic.id,
                service_id       = service_id,
                service_name_raw = item["title"],
                service_name_norm= norm_name,
                price_kzt        = item["price"],
                category         = cat_str,   # строка, не объект
                duration_days    = item.get("duration_days"),
                is_active        = True,
            )
            session.add(new_price)
            session.flush()                              # получаем new_price.id
            update_price_history(session, new_price)    # первая точка истории

    session.commit()


# ─── Сохранение филиалов ──────────────────────────────────────────────────────

def save_clinic_branches(session: Session, branches: list[dict], clinic_info: dict, source_url: str) -> int:
    clinic = session.execute(
        select(Clinic).where(
            Clinic.name == clinic_info["name"],
            Clinic.city == clinic_info["city"],
        )
    ).scalar_one_or_none()

    if not clinic:
        clinic = Clinic(
            name=clinic_info["name"],
            city=clinic_info["city"],
            source_url=source_url,
        )
        session.add(clinic)
        session.flush()

    added = 0
    for b in branches:
        address = b.get("address", "").strip()
        if not address:
            continue

        exists = session.execute(
            select(ClinicBranch).where(
                ClinicBranch.clinic_id == clinic.id,
                ClinicBranch.address   == address,
            )
        ).scalar_one_or_none()

        if not exists:
            session.add(ClinicBranch(
                clinic_id    = clinic.id,
                address      = address,
                phone        = b.get("phone"),
                working_hours= b.get("working_hours"),
            ))
            added += 1

    session.commit()
    return added


# ─── Логирование ──────────────────────────────────────────────────────────────

def log_parser_execution(session: Session, url: str, status: str, error: str = None):
    session.add(ParserLog(
        source_url  = url,
        status      = status,
        error_msg   = error,
        finished_at = datetime.now(timezone.utc),
    ))
    session.commit()