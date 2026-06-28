import asyncio
import random
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from back.app.models import Base, ServiceCategory
from back.app.config import settings
from back.app.db_service import save_parsed_data, save_clinic_branches, log_parser_execution

CITIES = [
    "abay", "akkol", "akkiistau", "akmol", "aksai", "aksu", "aksukent", "aktau", "aktobe", "aktogay", "alatau", "alga", "almaty", "altai", "aralsk", "arkalyk", "arshaly", "arys", "ashchybulak", "asykata",
    "astana", "astrakhanka", "atakent", "atameken", "atbasar", "atyrau", "auliekol", "ayagoz",
    "baisarke", "bakanas", "baikonur", "balkashino", "balkhash", "balpyk bi", "bayanauyl", "beineu", "besagash", "beskaragay", "bishkul", "boraldai", "bulaevo", "chapai", "chingirlau", "chundzha", "denisovka", "dossor",
    "ekibastuz", "emba", "erkingala", "esik", "esil", "fedorovka", "glubokoe", "inder", "irgeli", "irtyshsk", "jambyl", "janatas", "zhalagash", 
    "zhanalaik", "zhanaarka", "zhanaozen", "zhanakorgan", "zhansugurov", "zharkent", "zhapek batyr", "zhelezinka", "zhezkazgan", "zhibek zholy", "zhitikara", "zhympity",
    "kabanbai", "kairat", "kalbatau", "kalininskoe", "kandyagash", "karabalyk", "karabulak", "karaganda", "karaoi", "karasai", "karatau", "karmakshi", "kaskelen","kasym kaisenov",
    "katon-karagai", "kazaly", "kazygurt", "kenen azerbaev", "kentau", "khromtau", "koksai", "koksayek", "kokshetau", "konaev", "kordai", "kosshyn", "kostanay", "kulan", "kulsary", "kurmangazy", "kyzylzhar", "kyzylorda",
    "lenger", "lisakovsk",  "makat",  "makinsk", "malaya churakovka", "mamlyutka", "mangistau", "makhambet", "mendykara", "merke", "miyaly", "myrzakent",
    "novoishimskoe", "ordabasy", "orkeniet", "otegen batyr", "pavlodar", "petropavlovsk", "presnovka", "raiymbek", "ridder", "rudny", "s.podstepnoe", "sagyz", "saumalkol", "saran", "sarkan", "saryagash", "sarykemer", "sarykol", "saryozek", "satpaev",
    "semey", "sergeevka", "shalkar", "shamalgan", "shanyrak", "shardara", "shaulder", "shayan", "shakhtinsk", "shubarkuduk", "shubarsu", "shchuchinsk", "shelek", "shemonaikha", "shetpe", "shieli", "shortandy", "sholakorgan", "shu", "shymkent", "smirnovo", "stepnogorsk",
    "taiynsha", "talapker", "taldykorgan", "talgar", "taraz", "taskala", "tekeli", "temirtau", "terenkol", "terenozek", "tobyl", "tole bi", "turar ryskulov", "turkestan", "shcherbakty", 
    "uarkhal", "urdjar", "ust-kamenogorsk", "ushkonyr",  "ushtobe", "uzynagash", "uzunkol", "yavlenka", "yntymak"
]

# ID города для куки currentCity — только те, у кого есть страница кабинетов
CITY_MAPPING = {
    "astana":     "98",
    "almaty":     "136",
    "shymkent":   "21",
    "karaganda":  "15",
    "temirtau":   "79",
    "shakhtinsk": "119",
    "abay":       "4",
    "balkhash":   "20",
    "saran":      "171",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9",
}

engine = create_engine(settings.DATABASE_URL_sync)


# ─── Парсеры ──────────────────────────────────────────────────────────────────

def parse_prices(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for card in soup.find_all("a", class_="analysis"):
        try:
            title_el = card.find("div", class_="title")
            if not title_el:
                continue
            title = title_el.text.strip()

            price_el = card.find("div", class_="price")
            if not price_el:
                continue
            clean_price = "".join(c for c in price_el.text if c.isdigit())
            if not clean_price:
                continue

            duration_el = card.find("div", class_="duration")
            duration_days = None
            if duration_el:
                digits = "".join(c for c in duration_el.text if c.isdigit())
                if digits:
                    duration_days = int(digits)

            results.append({
                "title":         title,
                "price":         int(clean_price),
                "duration_days": duration_days,
                "category_enum": ServiceCategory.laboratory,
            })
        except Exception:
            continue

    return results


def parse_branches(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    branches = []

    for card in soup.find_all("div", class_="cabinet"):
        try:
            address_div = card.find("div", class_="address")
            if not address_div:
                continue
            address = address_div.get_text(strip=True)

            phone_div = card.find("div", class_="phone")
            phone = phone_div.get_text(strip=True) if phone_div else None

            schedule_parts = []
            for block in card.find_all("div", class_="date"):
                days_el = block.find("div", class_="days")
                time_el = block.find("div", class_="time")
                if days_el and time_el:
                    time_text = time_el.get_text(strip=True)
                    # Пропускаем незарендеренный JS
                    if "timeWork" in time_text or "+ '" in time_text:
                        continue
                    schedule_parts.append(f"{days_el.get_text(strip=True)}: {time_text}")

            branches.append({
                "address":       address,
                "phone":         phone,
                "working_hours": ", ".join(schedule_parts) if schedule_parts else None,
            })
        except Exception:
            continue

    return branches


# ─── Задачи ───────────────────────────────────────────────────────────────────

async def fetch_city(city: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore):
    async with semaphore:
        await _fetch_prices(city, client)
        await _fetch_branches(city, client)


async def _fetch_prices(city: str, client: httpx.AsyncClient):
    url = f"https://www.kdlolymp.kz/pricelist/{city}"
    await asyncio.sleep(random.uniform(1.0, 2.0))
    try:
        res = await client.get(url, timeout=20.0)
        if res.status_code != 200:
            with Session(engine) as s:
                log_parser_execution(s, url, "error", f"HTTP {res.status_code}")
            print(f"  [-] KDL ({city}) цены: статус {res.status_code}")
            return

        items = parse_prices(res.text)
        if not items:
            print(f"  [-] KDL ({city}) цены: данных нет")
            return

        with Session(engine) as s:
            save_parsed_data(s, items, {"name": "КДЛ Олимп", "city": city}, url)
            log_parser_execution(s, url, "success")
        print(f"  [+] KDL ({city}) цены: {len(items)} услуг")

    except Exception as e:
        with Session(engine) as s:
            log_parser_execution(s, url, "error", str(e))
        print(f"  [-] KDL ({city}) цены: {e}")


async def _fetch_branches(city: str, client: httpx.AsyncClient):
    city_id = CITY_MAPPING.get(city)
    if not city_id:
        return  # у этого города нет кабинетов на сайте — молча пропускаем

    url = "https://www.kdlolymp.kz/cabinets"
    await asyncio.sleep(random.uniform(1.0, 1.5))
    try:
        res = await client.get(url, cookies={"currentCity": city_id}, timeout=20.0)
        if res.status_code != 200:
            print(f"  [-] KDL ({city}) адреса: статус {res.status_code}")
            return

        branches = parse_branches(res.text)
        if not branches:
            print(f"  [-] KDL ({city}) адреса: не найдено")
            return

        with Session(engine) as s:
            save_clinic_branches(s, branches, {"name": "КДЛ Олимп", "city": city}, url)
        print(f"  [+] KDL ({city}) адреса: {len(branches)} филиалов")

    except Exception as e:
        print(f"  [-] KDL ({city}) адреса: {e}")


# ─── Точка входа ──────────────────────────────────────────────────────────────

async def run():
    Base.metadata.create_all(engine)
    semaphore = asyncio.Semaphore(2)

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        tasks = [fetch_city(city, client, semaphore) for city in CITIES]
        print(f"[*] КДЛ Олимп — {len(tasks)} городов...")
        await asyncio.gather(*tasks)

    print("[✓] Готово")


if __name__ == "__main__":
    asyncio.run(run())