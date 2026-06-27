import asyncio
import random
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from back.app.models import Base, ServiceCategory
from back.app.config import settings
from back.app.db_service import save_parsed_data, save_clinic_branches, log_parser_execution

CITY_MAP = {
    "almaty":          3,
    "astana":          1,
    "karaganda":       4,
    "shymkent":        5,
    "kokshetau":      16,
    "aktobe":         10,
    "kyzylorda":      14,
    "aktau":           6,
    "taraz":          13,
    "ust-kamenogorsk":15,
    "pavlodar":       12,
    "semey":          17,
}

SPECIALTIES = [
    "akusher-ginekolog", "terapevt", "kardiolog", "nevrolog", "endokrinolog",
    "oftalmolog", "urolog", "hirurg", "lor", "dermatolog",
    "pediatr", "psihiatr", "ortoped", "gastroenterolog", "onkolog", "allergolog",
]

SPECIALTY_LABELS = {
    "akusher-ginekolog": "Акушер-гинеколог",
    "terapevt":          "Терапевт",
    "kardiolog":         "Кардиолог",
    "nevrolog":          "Невролог",
    "endokrinolog":      "Эндокринолог",
    "oftalmolog":        "Офтальмолог",
    "urolog":            "Уролог",
    "hirurg":            "Хирург",
    "lor":               "ЛОР",
    "dermatolog":        "Дерматолог",
    "pediatr":           "Педиатр",
    "psihiatr":          "Психиатр",
    "ortoped":           "Ортопед",
    "gastroenterolog":   "Гастроэнтеролог",
    "onkolog":           "Онколог",
    "allergolog":        "Аллерголог",
}

# Хардкод ID — используется как фоллбек если API справочника недоступен
FALLBACK_SPECIALTY_MAP = {
    "terapevt": 97,
    "akusher-ginekolog": 73,
    "pediatr": 78,
    "lor": 72,              # Отоларинголог
    "nevrolog": 61,          # Невропатолог
    "kardiolog": 41,
    "hirurg": 102,
    "dermatolog": 26,        # Дерматовенеролог
    "oftalmolog": 73,        # Окулист
    "urolog": 100,
    "endokrinolog": 105,
    "gastroenterolog": 11,
    "ortoped": 98,           # Травматолог-ортопед
    "allergolog": 74,         # Иммунолог
    "anesteziolog-reanimatolog": 2,
    
    # Узкие специалисты (Взрослые и детские)
    "uzi-specialist": 99,    # Врач УЗИ / Сонолог
    "stomatolog": 94,        # Стоматолог (общий / хирург / ортодонт)
    "nevrolog-detskiy": 62,  # Детский невролог
    "proktolog": 84,         # Колопроктолог
    "onkolog": 69,          # Онколог / Маммолог
    "mammolog": 51,          # Чистый маммолог
    "nevropatolog": 61,      # Дубликат для маппинга невролога
    "ginekolog": 13,         # Дубликат для гинеколога
    "ftiziatr": 101,
    "pulmonolog": 85,
    "revmatolog": 87,
    "nefrolog": 64,          # Специалист по почкам
    "psihoterapevt": 83,     # Психотерапевт / Психиатр
    "gematolog": 12,         # Специалист по крови
    "infekcionist": 37,
    "allergolog-detskiy": 3, # Детский аллерголог
    "hirurg-detskiy": 103,   # Детский хирург
    "ortoped-detskiy": 71,   # Детский ортопед / Траматолог
    "ginekolog-detskiy": 22, # Детский гинеколог
    "urolog-detskiy": 110,   # Детский уролог
    "kardiolog-detskiy": 42, # Детский кардиолог
    "endokrinolog-detskiy": 106, # Детский эндокринолог
    "gastroenterolog-detskiy": 14, # Детский гастроэнтеролог

    # Специфические и диагностические направления
    "allergolog-immunolog": 2,
    "venerolog": 75,
    "androlog": 1,           # Мужское здоровье
    "gomeopat": 23,
    "dietolog": 27,
    "implantolog": 33,       # Стоматолог-имплантолог
    "kinesteziterapevt": 43, # Мануальный терапевт / Реабилитолог
    "kosmetolog": 46,
    "logoped": 49,
    "narkolog": 59,
    "ortodont": 70,          # Исправление прикуса
    "osteopat": 74,
    "parodontolog": 77,
    "psiholog": 82,
    "radiolog": 86,          # Рентгенолог / МРТ / КТ
    "refleksoterapevt": 89,  # Иглоукалывание
    "seksopatolog": 91,
    "surdolog": 95,          # Слуховой аппарат / ЛОР
    "triholog": 96,          # Специалист по волосам
    "fizioterapevt": 107,
    "funkcionalnyy-diagnost": 108 # ЭКГ / СМАД / Холтер
}

# Заполняется при старте из API, фоллбек если API недоступен
DYNAMIC_SPECIALTY_MAP: dict[str, int] = {}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept":     "application/json, text/plain, */*",
    "Origin":     "https://doq.kz",
    "Referer":    "https://doq.kz/",
}

engine = create_engine(settings.DATABASE_URL_sync)


# ─── Парсер JSON ──────────────────────────────────────────────────────────────

def parse_json_doctors(data: dict, city_slug: str, specialty_slug: str) -> list[dict]:
    results = []
    doctors_list = data.get("results", []) if isinstance(data, dict) else (data or [])
    specialty_label = SPECIALTY_LABELS.get(specialty_slug, specialty_slug)

    parsed_count = 0
    skipped_no_price = 0
    skipped_duplicate = 0
    seen_doctors: set[str] = set()

    for doc in doctors_list:
        try:
            doctor_name = doc.get("name", "").strip()
            if not doctor_name:
                continue

            if doctor_name in seen_doctors:
                skipped_duplicate += 1
                continue

            experience_years = doc.get("experience")
            experience = f"Стаж {experience_years} лет" if experience_years else None

            branches = doc.get("clinic_branches") or []
            clinic_name = "Doq.kz"
            address = None

            if branches and isinstance(branches, list):
                first_branch = branches[0]
                clinic_name = first_branch.get("name") or clinic_name
                address = first_branch.get("address")

            if address and "онлайн" in address.lower():
                address = None

            # Ищем цену для нужной специальности
            services = doc.get("services") or []
            price = None

            for srv in services:
                if srv.get("service", {}).get("slug") == specialty_slug:
                    price = srv.get("total") or srv.get("price")
                    break

            if not price and services:
                price = services[0].get("total") or services[0].get("price")

            if price:
                if isinstance(price, str):
                    price = "".join(c for c in price if c.isdigit())
                price = int(price) if price else None

            if not price:
                skipped_no_price += 1
                continue

            service_title = f"Приём {specialty_label} — {doctor_name}"
            if experience:
                service_title += f" ({experience})"

            results.append({
                "title":         service_title,
                "price":         price,
                "category_enum": ServiceCategory.doctor,
                "_clinic_name":  clinic_name,
                "_address":      address,
                "_doctor_name":  doctor_name,
                "_specialty":    specialty_label,
            })

            seen_doctors.add(doctor_name)
            parsed_count += 1

        except Exception as e:
            print(f"    [-] Ошибка врача ({city_slug}/{specialty_slug}): {e}")

    if parsed_count or skipped_no_price:
        print(
            f"  [~] {city_slug}/{specialty_label}: "
            f"спарсено={parsed_count} | без цены={skipped_no_price} | дубли={skipped_duplicate}"
        )

    return results


# ─── Запрос к API ─────────────────────────────────────────────────────────────

async def fetch_specialty(
    city: str,
    specialty: str,
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
):
    city_id    = CITY_MAP.get(city)
    service_id = DYNAMIC_SPECIALTY_MAP.get(specialty)

    if not city_id or not service_id:
        return  # специальность не нашлась ни в API ни в фоллбеке

    all_items: list[dict] = []
    offset = 0
    limit  = 50

    async with semaphore:
        while True:
            params = {
                "limit":   limit,
                "city":    city_id,
                "service": service_id,
                "offset":  offset,
                "expand":  "clinic_branches,services",
            }
            await asyncio.sleep(random.uniform(0.3, 0.7))

            try:
                res = await client.get(
                    "https://api.doq.kz/api/v1/doctors/",
                    params=params,
                    timeout=15.0,
                )
                if res.status_code != 200:
                    print(f"  [-] doq {city}/{specialty}: HTTP {res.status_code}")
                    break

                data  = res.json()
                items = parse_json_doctors(data, city, specialty)

                if not items:
                    break

                all_items.extend(items)

                total_returned = len(data.get("results", [])) if isinstance(data, dict) else 0
                if total_returned < limit or offset > 500:
                    break

                offset += limit

            except Exception as e:
                print(f"  [-] doq {city}/{specialty}: {e}")
                break

    if not all_items:
        return

    source_url  = f"https://doq.kz/doctors/{city}/{specialty}"
    clinic_meta = {"name": "Doq.kz", "city": city}

    try:
        with Session(engine) as session:
            save_parsed_data(session, all_items, clinic_meta, source_url)

            branches = [
                {"address": item["_address"], "phone": None, "working_hours": None}
                for item in all_items
                if item.get("_address")
            ]
            if branches:
                seen: set[str] = set()
                unique = []
                for b in branches:
                    if b["address"] not in seen:
                        seen.add(b["address"])
                        unique.append(b)
                save_clinic_branches(session, unique, clinic_meta, source_url)

            log_parser_execution(session, source_url, "success")

        print(f"  [+] doq {city}/{specialty}: сохранено {len(all_items)}")

    except Exception as e:
        print(f"  [-] doq {city}/{specialty} — ошибка БД: {e}")
        try:
            with Session(engine) as session:
                log_parser_execution(session, source_url, "error", str(e))
        except Exception:
            pass


# ─── Точка входа ──────────────────────────────────────────────────────────────

async def run():
    Base.metadata.create_all(engine)
    semaphore = asyncio.Semaphore(4)

    print("[*] Загружаем справочник специальностей с API doq.kz...")

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:

        # Пытаемся загрузить актуальные ID специальностей
        try:
            res = await client.get(
                "https://api.doq.kz/api/v1/specialties/?limit=200",
                timeout=10.0,
            )
            if res.status_code == 200:
                for item in res.json().get("results", []):
                    slug   = item.get("slug")
                    sp_id  = item.get("id")
                    if slug and sp_id:
                        DYNAMIC_SPECIALTY_MAP[slug] = sp_id
                print(f"[+] API: загружено {len(DYNAMIC_SPECIALTY_MAP)} специальностей")
            else:
                raise ValueError(f"HTTP {res.status_code}")

        except Exception as e:
            # Фоллбек — используем хардкод всех специальностей
            print(f"[!] API справочника недоступен ({e}), используем хардкод фоллбек")
            DYNAMIC_SPECIALTY_MAP.update(FALLBACK_SPECIALTY_MAP)
            print(f"[+] Фоллбек: загружено {len(DYNAMIC_SPECIALTY_MAP)} специальностей")

        # Показываем какие специальности не нашлись
        missing = [s for s in SPECIALTIES if s not in DYNAMIC_SPECIALTY_MAP]
        if missing:
            print(f"[!] Не найдены в справочнике: {missing}")

        tasks = [
            fetch_specialty(city, spec, client, semaphore)
            for city in CITY_MAP
            for spec in SPECIALTIES
            if spec in DYNAMIC_SPECIALTY_MAP
        ]

        print(f"[*] Запускаем {len(tasks)} задач ({len(CITY_MAP)} городов × специальностей)...")
        await asyncio.gather(*tasks)

    print("[✓] doq.kz завершён")


if __name__ == "__main__":
    asyncio.run(run())