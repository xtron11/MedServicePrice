"""
normalizer.py — детерминированная нормализация названий медуслуг на основе расстояния Левенштейна.

Уровень 1 (rapidfuzz WRatio >= 90):   Автоматическая привязка с жесткой медицинской валидацией.
Уровень 2 (остаток):                  unmatched_queue → очередь для ручной разметки.
"""

import sys
import os
import re
from rapidfuzz import process, fuzz
from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import ServiceCatalog, Price, UnmatchedQueue, ServiceCategory
from app.config import settings

# ─── КОНСТАНТЫ И НАСТРОЙКИ ───────────────────────────────────────────────────

THRESHOLD = 90

# Маркеры, которые КРИТИЧЕСКИ меняют смысл услуги
STRICT_MARKERS = {
    "ат": ["ат", "антитела", "anti", "antibodies"],
    "моча": ["моча", "мочи", "urine"],
    "лпвп": ["лпвп", "hdl", "высокой плотности"],
    "лпнп": ["лпнп", "ldl", "низкой плотности"],
    "лдг": ["лдг", "лактатдегидрогеназа"],
    "прямой": ["прямой", "direct"],
    "общий": ["общий", "total"],
    "свободный": ["свободный", "free", " f"],
    "суточный": ["суточная", "24 часа", "суток"],
}

# Список органов для защиты УЗИ от ложных пересечений
ORGAN_MARKERS = ["почек", "молочных", "брюшной", "щитовидной", "малого таза", "фолликулогенез", "слюнных"]


# ─── ВСПОМОГАТЕЛЬНАЯ ЛОГИКА ВАЛИДАЦИИ ────────────────────────────────────────

def clean_name(name: str) -> str:
    if not name: 
        return ""
    name = name.lower()
    # Оставляем только буквы, цифры и пробелы
    name = re.sub(r'[^a-zа-я0-9\s]', ' ', name)
    return " ".join(name.split()).lower()


def is_medical_match(raw: str, norm: str) -> bool:
    """
    Медицинский валидатор: проверяет, нет ли в названиях 
    критических противоречий.
    """
    raw, norm = raw.lower(), norm.lower()

    # 1. Проверка на АНТИТЕЛА
    for m in STRICT_MARKERS["ат"]:
        if (m in raw) != (m in norm): return False

    # 2. Проверка на БИОМАТЕРИАЛ (Моча vs Кровь) — Жесткое двустороннее разделение
    is_raw_urine = any(m in raw for m in STRICT_MARKERS["моча"])
    is_norm_urine = any(m in norm for m in STRICT_MARKERS["моча"])
    if is_raw_urine != is_norm_urine: return False
    
    if "моч" in raw and "кров" in norm: return False
    if "кров" in raw and "моч" in norm: return False

    # 3. Проверка на ХОЛЕСТЕРИН (ЛПВП vs ЛПНП vs Общий)
    for key in ["лпвп", "лпнп"]:
        for m in STRICT_MARKERS[key]:
            if (m in raw) != (m in norm): return False

    # 4. Проверка на БИЛИРУБИН/ГОРМОНЫ (Прямой vs Свободный vs Общий)
    for key in ["прямой", "свободный", "общий"]:
        for m in STRICT_MARKERS[key]:
            if m in raw and m not in norm: return False

    # 5. Защита для УЗИ / Диагностики
    if "узи" in raw or "ультразвуковое" in raw or "узи" in norm or "ультразвуковое" in norm:
        for organ in ORGAN_MARKERS:
            if (organ in raw) != (organ in norm): return False

    # 6. Защита от КОМПЛЕКСОВ (Пересечение множественных компонентов)
    combos = [" и ", " + ", "комплекс", "профиль", "пакет", "смесь", ", "]
    
    # Считаем количество упоминаний элементов в сырой строке
    elements = ["цинк", "zinc", "кальций", "calcium", "магний", "magnesium", "витамин d", "витамин д"]
    raw_elements_count = sum(1 for el in elements if el in raw)
    norm_elements_count = sum(1 for el in elements if el in norm)
    
    # Если в сыром названии ищется ТОЛЬКО ОДИН элемент (например, чистый цинк),
    # а эталон содержит много элементов (комплекс), то запрещаем привязку.
    if raw_elements_count == 1 and norm_elements_count > 1:
        return False
        
    # И наоборот: если это комплекс, а привязывается к одиночному
    if raw_elements_count > 1 and norm_elements_count == 1:
        return False

    if any(c in raw for c in combos) and "комплекс" not in norm and " и " not in norm and " + " not in norm:
        return False

    return True


# ─── ОСНОВНОЙ ПРОЦЕСС ────────────────────────────────────────────────────────

def run_normalization():
    engine = create_engine(settings.DATABASE_URL_sync)

    with Session(engine) as session:
        catalog = session.execute(select(ServiceCatalog)).scalars().all()
        prices = session.execute(select(Price).where(Price.service_id == None)).scalars().all()

        if not prices:
            print("[✓] Все записи уже нормализованы.")
            return

        print(f"[*] Обработка {len(prices)} записей через RapidFuzz...")
        
        m_count, u_count = 0, 0

        for p in prices:
            q_raw = p.service_name_raw.lower()
            q_clean = clean_name(q_raw)

            # Собираем базу для поиска СТРОГО по категории (Лаборатория к лаборатории, УЗИ к УЗИ)
            choices = {}
            for item in catalog:
                if item.category == p.category:
                    choices[clean_name(item.name)] = item
                    if item.synonyms:
                        for s in item.synonyms.split(","):
                            choices[clean_name(s)] = item

            if not choices: 
                u_count += 1
                continue

            # Выполняем Fuzzy поиск с использованием WRatio (более точный для медицины)
            result = process.extractOne(
                q_clean, 
                list(choices.keys()), 
                scorer=fuzz.WRatio, 
                score_cutoff=THRESHOLD
            )

            if result:
                best_name, score, _ = result
                matched_item = choices[best_name]

                # --- ЖЕСТКАЯ МЕДИЦИНСКАЯ ВАЛИДАЦИЯ ---
                if is_medical_match(q_raw, matched_item.name):
                    p.service_id = matched_item.id
                    p.service_name_norm = matched_item.name
                    m_count += 1
                else:
                    u_count += 1
                    insert_unmatched_queue(session, p)
            else:
                u_count += 1
                insert_unmatched_queue(session, p)

            # Пачечный коммит для оптимизации скорости работы с БД
            if (m_count + u_count) % 500 == 0:
                session.commit()

        session.commit()
        print(f"\n[✓] ГОТОВО. Привязано корректно: {m_count}, Отклонено/Не найдено: {u_count}")


def insert_unmatched_queue(session, price_row):
    """Вспомогательный метод добавления записи в очередь нераспознанного"""
    exists = session.execute(
        select(UnmatchedQueue).where(UnmatchedQueue.service_name_raw == price_row.service_name_raw)
    ).scalar_one_or_none()
    if not exists:
        session.add(UnmatchedQueue(
            service_name_raw=price_row.service_name_raw,
            source_url=price_row.clinic.source_url if price_row.clinic else "Parser",
            clinic_name=price_row.clinic.name if price_row.clinic else "Unknown"
        ))


# ─── SEED DATA (ЭТАЛОНЫ) ─────────────────────────────────────────────────────

SEED_DATA = [
    # --- ЛАБОРАТОРИЯ: Базовые анализы ---
    ("Общий анализ крови", "ОАК, CBC, Синонимы: Лейкоцитарная формула", ServiceCategory.laboratory),
    ("Общий анализ мочи", "ОАМ", ServiceCategory.laboratory),
    ("Инсулин", "Insulin, Инсулин человеческий", ServiceCategory.laboratory),
    ("АТ к инсулину", "антитела к инсулину, Anti Insulin", ServiceCategory.laboratory),
    ("ТТГ", "Тиреотропный гормон, TSH", ServiceCategory.laboratory),
    ("АТ к рецепторам ТТГ", "антитела к рецепторам ттг, Anti TSHR", ServiceCategory.laboratory),
    ("Общий холестерин", "Холестерол общий", ServiceCategory.laboratory),
    ("Холестерин ЛПВП", "HDL, Холестерин высокой плотности", ServiceCategory.laboratory),
    ("Холестерин ЛПНП", "LDL, Холестерин низкой плотности", ServiceCategory.laboratory),
    ("Билирубин общий", "Билирубин total", ServiceCategory.laboratory),
    ("Билирубин прямой", "Билирубин direct", ServiceCategory.laboratory),
    ("Лактат", "Молочная кислота, ЛДГ, Лактатдегидрогеназа", ServiceCategory.laboratory),
    ("Магний (кровь)", "Magnesium", ServiceCategory.laboratory),
    ("Магний (моча)", "Магний в моче", ServiceCategory.laboratory),
    ("Ферритин", "Ferritin", ServiceCategory.laboratory),
    ("Креатинин", "Креатинин в крови, Creatinine", ServiceCategory.laboratory),
    ("Креатинин (моча)", "Креатинин в моче", ServiceCategory.laboratory),
    ("Мочевина", "Мочевина в крови, Urea", ServiceCategory.laboratory),
    ("Мочевина (моча)", "Мочевина в моче", ServiceCategory.laboratory),

    # --- ЛАБОРАТОРИЯ: Глюкоза (Разделение по биоматериалу) ---
    ("Глюкоза (кровь)", "Сахар в крови, Глюкоза крови", ServiceCategory.laboratory),
    ("Глюкоза (моча)", "Глюкоза в моче, Глюкоза мочи", ServiceCategory.laboratory),

    # --- ЛАБОРАТОРИЯ: Витамины и специфические комплексы (Решение проблемы строк 6, 7, 13, 41) ---
    ("25-OH витамин D", "25-ОН витамин Д, Кальциферол, 25-hydroxycalciferol", ServiceCategory.laboratory),
    ("Витамин D и кальций", "Витамин D + Кальций, Кальций и витамин Д", ServiceCategory.laboratory),
    ("Комплекс витаминов (D, K, Йод)", "Витамин D, K и йод, Комплекс витаминов", ServiceCategory.laboratory),
    ("Витамин D3 активная форма", "1,25-дигидроксивитамин D3, 1,25(OH)2D3, Кальцитриол", ServiceCategory.laboratory),
    ("Витамин D и K", "Витамин D и K суммарно, Витамин D + K", ServiceCategory.laboratory),
    ("Комплекс Витамин D, кальций, магний, цинк", "Витамин D, кальций, магний, цинк", ServiceCategory.laboratory),

    # --- ДИАГНОСТИКА: УЗИ (Разделение по органам-маркерам) ---
    ("УЗИ почек", "Ультразвуковое исследование почек, УЗИ мочевыделительной системы", ServiceCategory.diagnostics),
    ("УЗИ органов брюшной полости", "УЗИ брюшной полости, УЗИ ОБП", ServiceCategory.diagnostics),
    ("УЗИ молочных желез", "Ультразвуковое исследование молочных желез", ServiceCategory.diagnostics),
    ("УЗИ фолликулогенеза", "Мониторинг созревания фолликула, фолликулогенез", ServiceCategory.diagnostics),
    ("УЗИ слюнных желез", "Ультразвуковое исследование слюнных желез", ServiceCategory.diagnostics),
    ("УЗИ плевральной полости", "Ультразвуковое исследование плевральной полости", ServiceCategory.diagnostics),
    ("УЗИ малого таза", "Ультразвуковое исследование органов малого таза, УЗИ ОМТ", ServiceCategory.diagnostics),
    ("УЗИ щитовидной железы", "Ультразвуковое исследование щитовидной железы", ServiceCategory.diagnostics),
]

def seed_catalog():
    engine = create_engine(settings.DATABASE_URL_sync)
    with Session(engine) as session:
        for name, syns, cat in SEED_DATA:
            exists = session.execute(select(ServiceCatalog).where(ServiceCatalog.name == name)).scalar_one_or_none()
            if not exists:
                session.add(ServiceCatalog(name=name, synonyms=syns, category=cat))
        session.commit()
        print("[✓] Справочник обновлен.")


def reset_normalization():
    engine = create_engine(settings.DATABASE_URL_sync)
    with Session(engine) as session:
        session.execute(update(Price).values(service_id=None, service_name_norm=None))
        session.execute(update(UnmatchedQueue).values(is_resolved=False))
        session.commit()
        print("[✓] Сброс выполнен.")


# ─── CLI ИНТЕРФЕЙС ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    if "--seed" in sys.argv: 
        seed_catalog()
    elif "--reset" in sys.argv: 
        reset_normalization()
    else: 
        run_normalization()