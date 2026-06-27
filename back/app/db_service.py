import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from rapidfuzz import process, utils
from back.app.models import (
    Base, Clinic, ClinicBranch, Price, RawPrice,
    ServiceCatalog, ServiceCategory, UnmatchedQueue, ParserLog
)

def normalize_service(session: Session, raw_name: str, category: str):
    catalog_items = session.execute(
        select(ServiceCatalog).where(ServiceCatalog.category == category)
    ).scalars().all()
    
    if not catalog_items:
        return None, None

    choices = {item.id: item.name for item in catalog_items}
    for item in catalog_items:
        if item.synonyms:
            for syn in item.synonyms.split(','):
                choices[f"{item.id}_syn_{syn}"] = syn.strip()

    result = process.extractOne(
        raw_name, 
        choices, 
        processor=utils.default_process, 
        score_cutoff=90 # Держим высокую точность
    )

    if result:
        matched_id_str = str(result[2])
        actual_id = matched_id_str.split('_syn_')[0]
        catalog_item = session.get(ServiceCatalog, actual_id)
        return catalog_item.id, catalog_item.name
    
    return None, None

def save_parsed_data(session: Session, items: list[dict], clinic_info: dict, source_url: str):
    if not items:
        return

    clinic = session.execute(
        select(Clinic).where(
            Clinic.name == clinic_info["name"], 
            Clinic.city == clinic_info["city"]
        )
    ).scalar_one_or_none()

    if not clinic:
        clinic = Clinic(
            name=clinic_info["name"],
            city=clinic_info["city"],
            source_url=source_url
        )
        session.add(clinic)
        session.flush()

    for item in items:
        # 1. RAW LAYER
        raw_entry = RawPrice(
            clinic_name_raw=f"{clinic.name} ({clinic.city})",
            service_name_raw=item["title"],
            price_raw=str(item["price"]),
            currency_raw="KZT",
            source_url=source_url
        )
        session.add(raw_entry)

        # 2. NORMALIZATION
        cat_enum = item.get("category_enum", "laboratory")
        service_id, norm_name = normalize_service(session, item["title"], cat_enum)

        if not service_id:
            unmatched_exists = session.execute(
                select(UnmatchedQueue).where(UnmatchedQueue.service_name_raw == item["title"])
            ).scalar_one_or_none()
            if not unmatched_exists:
                session.add(UnmatchedQueue(
                    service_name_raw=item["title"],
                    source_url=source_url,
                    clinic_name=clinic.name
                ))

        # 3. PRICE LAYER
        existing_price = session.execute(
            select(Price).where(
                Price.clinic_id == clinic.id, 
                Price.service_name_raw == item["title"]
            )
        ).scalar_one_or_none()

        if existing_price:
            existing_price.price_kzt = item["price"]
            existing_price.service_id = service_id
            existing_price.service_name_norm = norm_name
            # Обновляем срок выполнения, если он есть
            if "duration_days" in item:
                existing_price.duration_days = item["duration_days"]
            existing_price.parsed_at = datetime.now(timezone.utc)
            existing_price.is_active = True
        else:
            new_price = Price(
                clinic_id=clinic.id,
                service_id=service_id,
                service_name_raw=item["title"],
                service_name_norm=norm_name,
                price_kzt=item["price"],
                category=cat_enum,
                duration_days=item.get("duration_days"),
                is_active=True
            )
            session.add(new_price)

    session.commit()


def save_clinic_branches(session: Session, branches: list[dict], clinic_info: dict, source_url: str):
    """
    Универсальная функция для всех парсеров.
    Ожидает branches: [{"address": str, "phone": str|None, "working_hours": str|None}]
    """
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
            # Если такого адреса нет — создаем новый
            session.add(ClinicBranch(
                clinic_id=    clinic.id,
                address=      address,
                phone=        b.get("phone"),
                working_hours=b.get("working_hours"),
            ))
            added += 1

    session.commit()
    return added

def log_parser_execution(session: Session, url: str, status: str, error: str = None):
    session.add(ParserLog(
        source_url=url, 
        status=status, 
        error_msg=error, 
        finished_at=datetime.now(timezone.utc)
    ))
    session.commit()