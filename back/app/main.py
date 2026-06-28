from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select, func, or_, update
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from back.app.config import settings
from back.app.models import (
    Base, Clinic, ClinicBranch, Price,
    ServiceCatalog, UnmatchedQueue, CATEGORY_LABELS, PriceHistory
)

engine = create_engine(settings.DATABASE_URL_sync)
Base.metadata.create_all(engine)

app = FastAPI(
    title="MedServicePrice.kz API",
    description="Агрегатор цен на медицинские услуги в Казахстане",
    version="1.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_session():
    return Session(engine)


def get_active_threshold():
    """Порог актуальности данных — 30 дней (требование ТЗ)."""
    return datetime.now(timezone.utc) - timedelta(days=30)


# ─── 1. СТАТИСТИКА (главная страница) ─────────────────────────────────────────
@app.get("/api/stats", summary="Статистика системы")
def get_stats():
    with get_session() as session:
        threshold = get_active_threshold()
        clinic_count = session.execute(
            select(func.count(Clinic.id))
        ).scalar()
        price_count = session.execute(
            select(func.count(Price.id))
            .where(Price.is_active == True, Price.parsed_at >= threshold)
        ).scalar()
        city_count = session.execute(
            select(func.count(Clinic.city.distinct()))
        ).scalar()

    return {
        "clinics":     clinic_count,
        "services":    price_count,
        "cities":      city_count,
        "update_date": datetime.now().strftime("%d.%m.%Y"),
    }


# ─── 2. АВТОДОПОЛНЕНИЕ ────────────────────────────────────────────────────────
@app.get("/api/suggest", summary="Подсказки для строки поиска")
def suggest(q: str = Query(..., min_length=2)):
    with get_session() as session:
        rows = session.execute(
            select(ServiceCatalog)
            .where(
                or_(
                    ServiceCatalog.name.ilike(f"%{q}%"),
                    ServiceCatalog.synonyms.ilike(f"%{q}%"),
                )
            )
            .limit(10)
        ).scalars().all()

    suggestions = []

    for item in rows:
        # Формируем один компактный объект для каждой услуги
        suggestions.append({
            "value": item.name,                             # Что пойдет в строку поиска при клике
            "all_synonyms": item.synonyms                   # Вообще все синонимы, если пригодятся
        })

    return {"suggestions": suggestions}


# ─── 3. ПОИСК ─────────────────────────────────────────────────────────────────
@app.get("/api/search", summary="Умный поиск с аналитикой цен")
def search(
    query:     str = Query(..., min_length=2),
    city:      str = Query(None),
    category:  str = Query(None),
    min_price: int = Query(None),
    max_price: int = Query(None),
    sort:      str = Query("price_asc"),
):
    try:
        with get_session() as session:

            # Ищем в справочнике по названию и синонимам
            catalog_service = session.execute(
                select(ServiceCatalog).where(
                    or_(
                        ServiceCatalog.name.ilike(f"%{query}%"),
                        ServiceCatalog.synonyms.ilike(f"%{query}%"),
                    )
                )
            ).scalars().first()

            # Основной запрос — Price + Clinic, без джойна филиалов
            # Филиалы подгружаем отдельно чтобы не было дублей
            stmt = (
                select(Price, Clinic)
                .join(Clinic, Price.clinic_id == Clinic.id)
                .where(Price.is_active == True)
                .where(Price.parsed_at >= get_active_threshold())
            )

            # Переключаем логику поиска в зависимости от результатов из справочника
            if catalog_service:
                stmt = stmt.where(
                    or_(
                        Price.service_id == catalog_service.id,
                        Price.service_name_raw.ilike(f"%{query}%")
                    )
                )
            else:
                stmt = stmt.where(Price.service_name_raw.ilike(f"%{query}%"))

            if city:      stmt = stmt.where(Clinic.city == city)
            if category:  stmt = stmt.where(Price.category == category)
            if min_price: stmt = stmt.where(Price.price_kzt >= min_price)
            if max_price: stmt = stmt.where(Price.price_kzt <= max_price)

            # Честная сортировка — без лишних полей в order_by
            if sort == "price_desc":
                stmt = stmt.order_by(Price.price_kzt.desc())
            elif sort == "updated":
                stmt = stmt.order_by(Price.parsed_at.desc())
            else:
                stmt = stmt.order_by(Price.price_kzt.asc())

            # ↴ ДОБАВЛЯЕМ СТРОКУ СЮДА (модифицируем сам SQL-запрос перед отправкой)
            stmt = stmt.limit(50)

            # База данных выполнит уже ограниченный запрос, вернув максимум 150 строк
            rows = session.execute(stmt).all()

            # Батч-загрузка филиалов одним запросом
            clinic_ids = list({r.Clinic.id for r in rows})

            branches_map: dict = {}
            if clinic_ids:
                branches = session.execute(
                    select(ClinicBranch)
                    .where(ClinicBranch.clinic_id.in_(clinic_ids))
                ).scalars().all()
                for b in branches:
                    branches_map.setdefault(b.clinic_id, []).append({
                        "address":       b.address,
                        "phone":         b.phone,
                        "working_hours": b.working_hours,
                    })

        prices_list = [
            float(r.Price.price_kzt)
            for r in rows
            if r.Price.price_kzt is not None
        ]
        analytics = {
            "min": min(prices_list) if prices_list else 0,
            "max": max(prices_list) if prices_list else 0,
            "avg": round(sum(prices_list) / len(prices_list), 0) if prices_list else 0,
        }

        results = [
            {
                "id":             str(r.Price.id),
                "service_id":     str(r.Price.service_id) if r.Price.service_id else None,
                "service_name":   r.Price.service_name_norm or r.Price.service_name_raw,
                "price_kzt":      float(r.Price.price_kzt) if r.Price.price_kzt else None,
                "category_label": CATEGORY_LABELS.get(r.Price.category, "Услуга"),
                "duration_days":  r.Price.duration_days,
                "clinic_id":      str(r.Clinic.id),
                "clinic_name":    r.Clinic.name,
                "city":           r.Clinic.city,
                "source_url":     r.Clinic.source_url,
                "updated_at":     r.Price.parsed_at.strftime("%d.%m.%Y") if r.Price.parsed_at else None,
                "branches":        branches_map.get(r.Clinic.id, [])[:3],
            }
            for r in rows
        ]

        return {
            "query":            query,
            "found_in_catalog": catalog_service.name if catalog_service else None,
            "count":            len(results),
            "analytics":        analytics,
            "results":          results,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── 4. ГОРОДА ────────────────────────────────────────────────────────────────
@app.get("/api/cities", summary="Список городов с клиниками")
def get_cities():
    with get_session() as session:
        rows = session.execute(
            select(Clinic.city).distinct().order_by(Clinic.city)
        ).scalars().all()
    return {"cities": rows}


# ─── 5. КЛИНИКИ В ГОРОДЕ ──────────────────────────────────────────────────────
@app.get("/api/clinics/{city}", summary="Клиники в городе с количеством услуг")
def get_clinics_by_city(city: str):
    with get_session() as session:
        threshold = get_active_threshold()
        rows = session.execute(
            select(
                Clinic.id,
                Clinic.name,
                Clinic.city,
                Clinic.source_url,
                func.count(Price.id).label("services_count"),
            )
            .join(Price, Price.clinic_id == Clinic.id)
            .where(
                Clinic.city == city,
                Price.is_active == True,
                Price.parsed_at >= threshold,
            )
            .group_by(Clinic.id)
            .order_by(Clinic.name)
        ).mappings().all()

    return {
        "city":    city,
        "count":   len(rows),
        "clinics": [dict(r) for r in rows],
    }


# ─── 6. ПРАЙС КЛИНИКИ ─────────────────────────────────────────────────────────
@app.get("/api/clinic/{clinic_id}/services", summary="Все услуги конкретной клиники")
def get_clinic_services(clinic_id: str):
    with get_session() as session:
        clinic = session.get(Clinic, clinic_id)
        if not clinic:
            raise HTTPException(status_code=404, detail="Клиника не найдена")

        branches = session.execute(
            select(ClinicBranch).where(ClinicBranch.clinic_id == clinic_id)
        ).scalars().all()

        threshold = get_active_threshold()
        prices = session.execute(
            select(Price)
            .where(
                Price.clinic_id == clinic_id,
                Price.is_active == True,
                Price.parsed_at >= threshold,
            )
            .order_by(Price.price_kzt.asc())
        ).scalars().all()

    return {
        "clinic": {
            "id":       str(clinic.id),
            "name":     clinic.name,
            "city":     clinic.city,
            "url":      clinic.source_url,
            "branches": [
                {
                    "address":       b.address,
                    "phone":         b.phone,
                    "working_hours": b.working_hours,
                }
                for b in branches
            ],
        },
        "services": [
            {
                "id":    str(p.id),
                "name":  p.service_name_norm or p.service_name_raw,
                "price": float(p.price_kzt) if p.price_kzt else None,
                "cat":   CATEGORY_LABELS.get(p.category),
                "days":  p.duration_days,
            }
            for p in prices
        ],
    }


# ─── 7. КАТЕГОРИИ ─────────────────────────────────────────────────────────────
@app.get("/api/categories", summary="Список категорий услуг")
def get_categories():
    return {
        "categories": [
            {"value": k, "label": v}
            for k, v in CATEGORY_LABELS.items()
        ]
    }

# ─── 8. ИСТОРИЯ ИЗМЕНЕНИЯ ЦЕН (ДЛЯ СТРОЙКИ ГРАФИКОВ НА ФРОНТЕ) ────────────────
@app.get("/api/service/history", summary="История цены за 30 дней")
def get_price_history(
    price_id: str = Query(..., description="ID из поля 'id' в результатах /api/search")
):
    try:
        with get_session() as session:
            from back.app.models import PriceHistory

            price = session.get(Price, price_id)
            if not price:
                raise HTTPException(status_code=404, detail="Услуга не найдена")

            cutoff = datetime.now(timezone.utc) - timedelta(days=30)  # ← timezone.utc обязательно

            rows = session.execute(
                select(
                    PriceHistory.price_kzt,
                    func.date(PriceHistory.recorded_at).label("date"),
                )
                .where(
                    PriceHistory.price_id    == price_id,
                    PriceHistory.recorded_at >= cutoff,
                )
                .group_by(PriceHistory.price_kzt, func.date(PriceHistory.recorded_at))
                .order_by(func.date(PriceHistory.recorded_at).asc())
            ).all()

        history = [
            {
                "date":  str(r.date),
                "price": float(r.price_kzt) if r.price_kzt else 0.0,
            }
            for r in rows
        ]

        # Считаем тренд
        direction, diff_kzt, diff_percent = "stable", 0.0, 0.0
        if len(history) >= 2:
            first, last = history[0]["price"], history[-1]["price"]
            diff_kzt = last - first
            diff_percent = round((diff_kzt / first) * 100, 1) if first > 0 else 0.0
            direction = "up" if diff_kzt > 0 else ("down" if diff_kzt < 0 else "stable")

        return {
            "price_id":      price_id,
            "service_name":  price.service_name_norm or price.service_name_raw,
            "current_price": history[-1]["price"] if history else float(price.price_kzt or 0),
            "trends": {
                "direction":    direction,
                "diff_kzt":     round(diff_kzt, 2),
                "diff_percent": diff_percent,
            },
            "history": history,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# ─── 9. ADMIN: ОЧЕРЕДЬ РАЗМЕТКИ ───────────────────────────────────────────────
@app.get("/api/admin/unmatched", summary="Неразмеченные услуги")
def get_unmatched(limit: int = 50, offset: int = 0):
    with get_session() as session:
        rows = session.execute(
            select(UnmatchedQueue)
            .where(UnmatchedQueue.is_resolved == False)
            .order_by(UnmatchedQueue.parsed_at.desc())
            .limit(limit).offset(offset)
        ).scalars().all()
        total = session.execute(
            select(func.count(UnmatchedQueue.id))
            .where(UnmatchedQueue.is_resolved == False)
        ).scalar()

    return {
        "total": total,
        "items": [
            {
                "id":               str(r.id),
                "service_name_raw": r.service_name_raw,
                "clinic_name":      r.clinic_name,
                "source_url":       r.source_url,
            }
            for r in rows
        ],
    }


@app.get("/api/admin/catalog", summary="Весь справочник услуг для выбора при разметке")
def get_admin_catalog():
    with get_session() as session:
        items = session.execute(
            select(ServiceCatalog).order_by(ServiceCatalog.name)
        ).scalars().all()
    return {
        "catalog": [
            {
                "id":             str(i.id),
                "name":           i.name,
                "category_label": CATEGORY_LABELS.get(i.category, "Услуга"),
            }
            for i in items
        ]
    }


@app.post("/api/admin/match", summary="Ручная привязка услуги оператором")
def manual_match(unmatched_id: str, service_catalog_id: str):
    with get_session() as session:
        item = session.get(UnmatchedQueue, unmatched_id)
        if not item:
            raise HTTPException(status_code=404, detail="Запись не найдена")

        catalog = session.get(ServiceCatalog, service_catalog_id)
        if not catalog:
            raise HTTPException(status_code=404, detail="Услуга в справочнике не найдена")

        # Обновляем все Price с таким же сырым названием
        session.execute(
            update(Price)
            .where(Price.service_name_raw == item.service_name_raw)
            .values(service_id=catalog.id, service_name_norm=catalog.name)
        )
        item.is_resolved = True
        session.commit()

    return {
        "status":  "success",
        "message": f"'{item.service_name_raw}' → '{catalog.name}'",
    }