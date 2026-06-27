from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select, func, or_, update
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

# ─── ОДИН импорт, один путь ───────────────────────────────────────────────────
from back.app.config import settings
from back.app.models import (
    Base, Clinic, ClinicBranch, Price,
    ServiceCatalog, ServiceCategory,
    UnmatchedQueue, CATEGORY_LABELS,
)

engine = create_engine(settings.DATABASE_URL_sync)
Base.metadata.create_all(engine)

app = FastAPI(
    title="MedServicePrice.kz API",
    description="Агрегатор цен на медицинские услуги в Казахстане",
    version="1.2.0",
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
    return datetime.now(timezone.utc) - timedelta(days=30)


# ─── 1. СТАТИСТИКА ────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats():
    with get_session() as session:
        threshold = get_active_threshold()
        return {
            "clinics":     session.execute(select(func.count(Clinic.id))).scalar(),
            "services":    session.execute(
                select(func.count(Price.id))
                .where(Price.is_active == True, Price.parsed_at >= threshold)
            ).scalar(),
            "cities":      session.execute(
                select(func.count(Clinic.city.distinct()))
            ).scalar(),
            "update_date": datetime.now().strftime("%d.%m.%Y"),
        }


# ─── 2. АВТОДОПОЛНЕНИЕ ────────────────────────────────────────────────────────
@app.get("/api/suggest")
def suggest(q: str = Query(..., min_length=2)):
    with get_session() as session:
        rows = session.execute(
            select(ServiceCatalog.name)
            .where(ServiceCatalog.name.ilike(f"%{q}%"))
            .limit(10)
        ).scalars().all()
    return {"suggestions": rows}


# ─── 3. ПОИСК ─────────────────────────────────────────────────────────────────
@app.get("/api/search")
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

            # Ищем в справочнике — по названию и синонимам
            catalog_service = session.execute(
                select(ServiceCatalog).where(
                    or_(
                        ServiceCatalog.name.ilike(f"%{query}%"),
                        ServiceCatalog.synonyms.ilike(f"%{query}%"),
                    )
                )
            ).scalars().first()

            # Основной запрос: Price + Clinic + первый филиал (LEFT JOIN)
            stmt = (
                select(
                    Price,
                    Clinic.name.label("clinic_name"),
                    Clinic.city,
                    Clinic.source_url,
                    ClinicBranch.address,
                    ClinicBranch.phone,
                    ClinicBranch.working_hours,
                )
                .join(Clinic, Price.clinic_id == Clinic.id)
                .outerjoin(ClinicBranch, ClinicBranch.clinic_id == Clinic.id)
                .where(Price.is_active == True)
                .where(Price.parsed_at >= get_active_threshold())
                .distinct(Price.id)
            )

            # Фильтр по справочнику или по сырому названию
            if catalog_service:
                stmt = stmt.where(Price.service_id == catalog_service.id)
            else:
                stmt = stmt.where(Price.service_name_raw.ilike(f"%{query}%"))

            if city:      stmt = stmt.where(Clinic.city == city)
            if category:  stmt = stmt.where(Price.category == category)
            if min_price: stmt = stmt.where(Price.price_kzt >= min_price)
            if max_price: stmt = stmt.where(Price.price_kzt <= max_price)

            if sort == "price_desc":
                stmt = stmt.order_by(Price.id, Price.price_kzt.desc())
            elif sort == "updated":
                stmt = stmt.order_by(Price.id, Price.parsed_at.desc())
            else:
                stmt = stmt.order_by(Price.id, Price.price_kzt.asc())

            rows = session.execute(stmt).all()

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
                "id":            str(r.Price.id),
                "service_name":  r.Price.service_name_norm or r.Price.service_name_raw,
                "price_kzt":     float(r.Price.price_kzt) if r.Price.price_kzt else None,
                "category_label":CATEGORY_LABELS.get(r.Price.category, "Услуга"),
                "clinic_name":   r.clinic_name,
                "city":          r.city,
                "address":       r.address,
                "phone":         r.phone,
                "working_hours": r.working_hours,
                "source_url":    r.source_url,
                "updated_at":    r.Price.parsed_at.strftime("%d.%m.%Y") if r.Price.parsed_at else None,
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
@app.get("/api/cities")
def get_cities():
    with get_session() as session:
        rows = session.execute(
            select(Clinic.city).distinct().order_by(Clinic.city)
        ).scalars().all()
    return {"cities": rows}


# ─── 5. КЛИНИКИ В ГОРОДЕ ──────────────────────────────────────────────────────
@app.get("/api/clinics/{city}")
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
        "clinics": [dict(r) for r in rows],
    }


# ─── 6. ПРАЙС КЛИНИКИ ─────────────────────────────────────────────────────────
@app.get("/api/clinic/{clinic_id}/services")
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
                "name":  p.service_name_norm or p.service_name_raw,
                "price": float(p.price_kzt) if p.price_kzt else None,
                "cat":   CATEGORY_LABELS.get(p.category),
                "days":  p.duration_days,
            }
            for p in prices
        ],
    }


# ─── 7. КАТЕГОРИИ ─────────────────────────────────────────────────────────────
@app.get("/api/categories")
def get_categories():
    return {
        "categories": [
            {"value": k, "label": v}
            for k, v in CATEGORY_LABELS.items()
        ]
    }


# ─── 8. ADMIN: ОЧЕРЕДЬ РАЗМЕТКИ ───────────────────────────────────────────────
@app.get("/api/admin/unmatched")
def get_unmatched(limit: int = 50, offset: int = 0):
    with get_session() as session:
        rows = session.execute(
            select(UnmatchedQueue)
            .where(UnmatchedQueue.is_resolved == False)
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
                "id":              str(r.id),
                "service_name_raw":r.service_name_raw,
                "clinic_name":     r.clinic_name,
                "source_url":      r.source_url,
            }
            for r in rows
        ],
    }


@app.post("/api/admin/match")
def manual_match(unmatched_id: str, service_catalog_id: str):
    with get_session() as session:
        item = session.get(UnmatchedQueue, unmatched_id)
        if not item:
            raise HTTPException(status_code=404, detail="Запись не найдена")

        catalog = session.get(ServiceCatalog, service_catalog_id)
        if not catalog:
            raise HTTPException(status_code=404, detail="Услуга в справочнике не найдена")

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