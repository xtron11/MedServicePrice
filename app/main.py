from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select, func, or_, update
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Base, Clinic, Price, ServiceCategory, ServiceCatalog, CATEGORY_LABELS, UnmatchedQueue
from datetime import datetime, timedelta

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

# Вспомогательная функция для получения единого порога актуальности данных по ТЗ (30 дней)
def get_active_threshold():
    return datetime.now() - timedelta(days=30)

# ─── 1. ОБЩАЯ СТАТИСТИКА (ДЛЯ ГЛАВНОЙ) ────────────────────────────────────────
@app.get("/api/stats", summary="Статистика системы")
def get_stats():
    with get_session() as session:
        active_threshold = get_active_threshold()
        clinic_count = session.execute(select(func.count(Clinic.id))).scalar()
        # Считаем только живые и актуальные по времени цены согласно ТЗ
        price_count = session.execute(
            select(func.count(Price.id)).where(Price.is_active == True, Price.parsed_at >= active_threshold)
        ).scalar()
        city_count = session.execute(select(func.count(Clinic.city.distinct()))).scalar()
    return {
        "clinics": clinic_count,
        "services": price_count,
        "cities": city_count,
        "update_date": datetime.now().strftime("%d.%m.%Y")
    }

# ─── 2. АВТОДОПОЛНЕНИЕ / ПОДСКАЗКИ ────────────────────────────────────────────
@app.get("/api/suggest", summary="Подсказки для строки поиска")
def suggest(q: str = Query(..., min_length=2)):
    """Возвращает названия из справочника для выпадающего списка."""
    with get_session() as session:
        stmt = select(ServiceCatalog.name).where(
            ServiceCatalog.name.ilike(f"%{q}%")
        ).limit(10)
        results = session.execute(stmt).scalars().all()
    return {"suggestions": results}

# ─── 3. ОБНОВЛЕННЫЙ ПОИСК С АНАЛИТИКОЙ ────────────────────────────────────────
@app.get("/api/search", summary="Умный поиск с аналитикой цен")
def search(
    query: str = Query(..., min_length=2),
    city:  str = Query(None),
    category: str = Query(None),
    min_price: int = Query(None),
    max_price: int = Query(None),
    sort: str = Query("price_asc"),
):
    with get_session() as session:
        catalog_stmt = select(ServiceCatalog).where(
            or_(
                ServiceCatalog.name.ilike(f"%{query}%"),
                ServiceCatalog.synonyms.ilike(f"%{query}%")
            )
        )
        catalog_service = session.execute(catalog_stmt).scalars().first()

        q = select(
            Price, 
            Clinic.name.label("clinic_name"),
            Clinic.city,
            Clinic.address,
            Clinic.phone,
            Clinic.source_url
        ).join(Clinic, Price.clinic_id == Clinic.id)

        # Жесткий фильтр по актуальности (30 дней) согласно ТЗ
        active_threshold = get_active_threshold()
        q = q.where(Price.is_active == True, Price.parsed_at >= active_threshold)

        if catalog_service:
            q = q.where(Price.service_id == catalog_service.id)
        else:
            q = q.where(Price.service_name_raw.ilike(f"%{query}%"))

        if city: q = q.where(Clinic.city == city)
        if category: q = q.where(Price.category == category)
        if min_price: q = q.where(Price.price_kzt >= min_price)
        if max_price: q = q.where(Price.price_kzt <= max_price)

        if sort == "price_desc": q = q.order_by(Price.price_kzt.desc())
        elif sort == "updated": q = q.order_by(Price.parsed_at.desc())
        else: q = q.order_by(Price.price_kzt.asc())

        results_raw = session.execute(q).all()

    prices = [float(r.Price.price_kzt) for r in results_raw]
    analytics = {
        "min": min(prices) if prices else 0,
        "max": max(prices) if prices else 0,
        "avg": round(sum(prices) / len(prices), 0) if prices else 0
    }

    results = [
        {
            "id":                str(r.Price.id),
            "service_name":      r.Price.service_name_norm or r.Price.service_name_raw,
            "price_kzt":         float(r.Price.price_kzt),
            "category_label":    CATEGORY_LABELS.get(r.Price.category, "Услуга"),
            "clinic_name":       r.clinic_name,
            "city":              r.city,
            "address":           r.address,
            "phone":             r.phone,
            "source_url":        r.source_url,
            "updated_at":        r.Price.parsed_at.strftime("%d.%m.%Y"),
        }
        for r in results_raw
    ]

    return {
        "query": query,
        "found_in_catalog": catalog_service.name if catalog_service else None,
        "count": len(results),
        "analytics": analytics,
        "results": results
    }

# ─── 4. ГОРОДА, КЛИНИКИ И КАТЕГОРИИ ───────────────────────────────────────────
@app.get("/api/cities")
def get_cities():
    with get_session() as session:
        rows = session.execute(select(Clinic.city).distinct().order_by(Clinic.city)).scalars().all()
    return {"cities": rows}

@app.get("/api/clinics/{city}")
def get_clinics_by_city(city: str):
    with get_session() as session:
        active_threshold = get_active_threshold()
        rows = session.execute(
            select(
                Clinic.id, Clinic.name, Clinic.city, Clinic.address, Clinic.phone,
                func.count(Price.id).label("services_count")
            )
            .join(Price, Price.clinic_id == Clinic.id)
            # ФИКС: Проверка на 30 дней добавлена и сюда
            .where(Clinic.city == city, Price.is_active == True, Price.parsed_at >= active_threshold)
            .group_by(Clinic.id).order_by(Clinic.name)
        ).mappings().all()
    return {"city": city, "clinics": rows}

@app.get("/api/clinic/{clinic_id}/services")
def get_clinic_services(clinic_id: str):
    with get_session() as session:
        clinic = session.get(Clinic, clinic_id)
        if not clinic: raise HTTPException(status_code=404, detail="Клиника не найдена")
        
        active_threshold = get_active_threshold()
        prices = session.execute(
            select(Price)
            # ФИКС: Проверка на 30 дней добавлена и сюда
            .where(Price.clinic_id == clinic_id, Price.is_active == True, Price.parsed_at >= active_threshold)
            .order_by(Price.price_kzt.asc())
        ).scalars().all()
    return {
        "clinic": {
            "name": clinic.name,
            "city": clinic.city,
            "address": clinic.address,
            "phone": clinic.phone,
            "hours": clinic.working_hours,
            "url": clinic.source_url
        },
        "services": [
            {
                "name": p.service_name_norm or p.service_name_raw, 
                "price": float(p.price_kzt), 
                "cat": CATEGORY_LABELS.get(p.category)
            } for p in prices
        ]
    }

@app.get("/api/categories")
def get_categories():
    return {"categories": [{"value": k, "label": v} for k, v in CATEGORY_LABELS.items()]}


# ─── 5. ОЧЕРЕДЬ РУЧНОЙ РАЗМЕТКИ (ДЛЯ АДМИНКИ ПО ТЗ) ───────────────────────────
@app.get("/api/admin/unmatched", summary="Получить список неразмеченных услуг")
def get_unmatched_services(limit: int = 50, offset: int = 0):
    """Выводит список уникальных сырых названий из unmatched queue для фронтенд-админки."""
    with get_session() as session:
        stmt = select(UnmatchedQueue).where(UnmatchedQueue.is_resolved == False).limit(limit).offset(offset)
        rows = session.execute(stmt).scalars().all()
        
        total = session.execute(select(func.count(UnmatchedQueue.id)).where(UnmatchedQueue.is_resolved == False)).scalar()
        
    return {
        "total_unmatched": total,
        "items": [
            {
                "id": r.id,
                "service_name_raw": r.service_name_raw,
                "clinic_name": r.clinic_name,
                "source_url": r.source_url
            } for r in rows
        ]
    }

@app.post("/api/admin/match", summary="Ручная привязка услуги оператором")
def manual_match_service(unmatched_id: int, service_catalog_id: str):
    """Связывает сырое название с каталогом и обновляет все цены в базе."""
    with get_session() as session:
        # 1. Берем запись из очереди
        unmatched_item = session.get(UnmatchedQueue, unmatched_id)
        if not unmatched_item:
            raise HTTPException(status_code=404, detail="Запись в очереди не найдена")
            
        # 2. Проверяем эталон в каталоге
        catalog_item = session.get(ServiceCatalog, service_catalog_id)
        if not catalog_item:
            raise HTTPException(status_code=404, detail="Услуга в справочнике не найдена")

        # 3. Обновляем все совпадения в таблице Price
        session.execute(
            update(Price)
            .where(Price.service_name_raw == unmatched_item.service_name_raw)
            .values(service_id=catalog_item.id, service_name_norm=catalog_item.name)
        )
        
        # 4. Помечаем задачу в очереди как решенную
        unmatched_item.is_resolved = True
        session.commit()
        
    return {"status": "success", "message": f"Услуга '{unmatched_item.service_name_raw}' успешно связана с '{catalog_item.name}'"}