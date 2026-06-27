import asyncio
import random
import httpx
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import sys
import os

# Добавляем корневую директорию в path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from back.app.models import Base, ServiceCategory
from back.app.config import settings
from back.app.db_service import save_parsed_data, log_parser_execution, save_clinic_branches

SOURCE = "invitro.kz"

CITIES = [
    "almaty", "astana", "shymkent", "karaganda", "aktobe", "esik",
    "pavlodar", "semey", "atyrau", "kostanay", "boralday", "zhanaozen",
    "taraz", "kyzylorda", "ust-kamenogorsk", "aktau", "uralsk", "irgeli",
    "otegen-batyra", "petropavlovsk", "saran", "uzynagash", "ushkonyr",
    "talgar2", "taldykorgan", "temirtau", "tuzdybastau"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9",
}

# Движок БД
engine = create_engine(settings.DATABASE_URL_sync)


def parse_branches_html(html_content: str) -> list:
    """
    Парсит физические офисы/кабинеты Инвитро.
    График работы зашит статически, чтобы обойти Vue/JS шаблоны на сайте.
    """
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    branches = []

    # Находим все карточки офисов
    cards = soup.find_all("div", class_=lambda x: x and "offices_card" in x)

    for card in cards:
        try:
            # 1. Извлекаем адрес
            addr_div = card.find("div", class_=lambda x: x and "address" in x)
            if not addr_div:
                continue
            address = addr_div.text.strip()
    
            standard_working_hours = "Пн-Пт: 07:00-15:00; Сб: 08:00-12:00; Вс: Выходной"

            # Формируем словарь СТРОГО под названия колонок в таблице ClinicBranch
            branches.append({
                "address": address,
                "phone": "+7 (707) 2 585 888",
                "working_hours": standard_working_hours
            })

        except Exception as e:
            print(f"[-] Ошибка разбора карточки офиса Инвитро: {e}")
            continue

    return branches


def parse_html(html_content: str) -> list:
    if not html_content:
        return []

    soup = BeautifulSoup(html_content, "html.parser")
    results = []
    cards = soup.find_all("div", class_="analyzes-list")

    for card in cards:
        try:
            title_div = card.find("div", class_="analyzes-item__title")
            if not title_div:
                continue
            
            title_a = title_div.find("a")
            title = title_a.text.strip() if title_a else title_div.text.strip()

            price_div = card.find("div", class_="analyzes-item__total--sum")
            if not price_div:
                continue

            raw_price = price_div.text.strip()
            clean_price = "".join([char for char in raw_price if char.isdigit()])
            
            if clean_price:
                price = int(clean_price)
            else:
                continue

            parent = card.find_parent()
            category_el = parent.find("a", class_="result-list__subtitle") if parent else None
            category = category_el.text.strip() if category_el else "Общее"

            results.append({
                "title": title,
                "price": price,
                "category": category
            })
        except Exception as e:
            print(f"[-] Ошибка разбора карточки в invitro.py: {e}")
            continue

    return results


def parse_uzi_html(html_content: str) -> list:
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, "html.parser")
    results = []
    cards = soup.find_all("div", class_=lambda x: x and "services-list" in x and "item_card" in x)
    
    for card in cards if cards else soup.find_all("div", class_="services-item"):
        try:
            title = card.get("data-name")
            price_raw = card.get("data-price")
            category = card.get("data-section", "УЗИ")
            
            if not title:
                title_el = card.find("a", class_="result-item__title")
                if not title_el:
                    continue
                title = title_el.text.strip()
                
            if not price_raw:
                price_div = card.find("div", class_=lambda x: x and "price" in x) or card
                price_text = price_div.text.strip()
                price_raw = "".join([char for char in price_text if char.isdigit()])
            
            clean_price = "".join([char for char in str(price_raw) if char.isdigit()])
            if not clean_price:
                continue
                
            results.append({
                "title": title.strip(),
                "price": int(clean_price),
                "category": category.strip()
            })
        except Exception as e:
            print(f"[-] Ошибка разбора карточки УЗИ в invitro.py: {e}")
            continue
            
    return results


async def fetch_city(city: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore):
    price_url = f"https://invitro.kz/analizes/for-doctors/{city}/"
    offices_url = f"https://invitro.kz/offices/{city}/"
    
    async with semaphore:
        # ----------------------------------------------------
        # ЧАСТЬ 1: Парсинг цен и анализов
        # ----------------------------------------------------
        await asyncio.sleep(random.uniform(1, 1.5))
        try:
            res = await client.get(price_url, timeout=20.0)
            if res.status_code == 200:
                items = parse_html(res.text)
                for i in items:
                    i["category_enum"] = ServiceCategory.laboratory
                
                with Session(engine) as session:
                    save_parsed_data(session, items, {"name": "Инвитро", "city": city}, price_url)
                    log_parser_execution(session, price_url, "success")
                print(f"  [+] Invitro ({city}): сохранено {len(items)} услуг")
            else:
                with Session(engine) as session:
                    log_parser_execution(session, price_url, "error", f"HTTP {res.status_code}")
        except Exception as e:
            print(f"  [-] Ошибка fetch_city (цены {city}): {e}")
            with Session(engine) as session:
                log_parser_execution(session, price_url, "error", str(e))

        # ----------------------------------------------------
        # ЧАСТЬ 2: Парсинг филиалов/офисов Инвитро
        # ----------------------------------------------------
        await asyncio.sleep(random.uniform(1, 1.5))
        try:
            res_offices = await client.get(offices_url, timeout=20.0)
            if res_offices.status_code == 200:
                branches = parse_branches_html(res_offices.text)
                if branches:
                    with Session(engine) as session:
                        save_clinic_branches(
                            session, 
                            branches, 
                            {"name": "Инвитро", "city": city}, 
                            offices_url
                        )
                    print(f"  [+] Invitro ({city}): успешно импортировано {len(branches)} филиалов")
                else:
                    print(f"  [-] Invitro ({city}): офисы в HTML не найдены")
            else:
                print(f"  [-] Ошибка сервера офисов Invitro ({city}): статус {res_offices.status_code}")
        except Exception as e:
            print(f"  [-] Исключение при парсинге офисов Invitro ({city}): {e}")


async def fetch_uzi(city: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore):
    url = f"https://invitro.kz/{city}/radiology/uzi/"
    async with semaphore:
        await asyncio.sleep(random.uniform(1, 1.5))
        try:
            res = await client.get(url, timeout=20.0)
            if res.status_code == 200:
                items = parse_uzi_html(res.text) 
                
                for i in items:
                    i["category_enum"] = ServiceCategory.diagnostics
                
                if items:
                    with Session(engine) as session:
                        save_parsed_data(session, items, {"name": "Инвитро", "city": city}, url)
                        log_parser_execution(session, url, "success")
                    print(f"   [+] Invitro UZI ({city}): сохранено {len(items)}")
                else:
                    print(f"   [-] Invitro UZI ({city}): Карточки УЗИ не найдены в HTML")
            else:
                with Session(engine) as session:
                    log_parser_execution(session, url, "error", f"HTTP {res.status_code}")
        except Exception as e:
            print(f"   [-] Ошибка fetch_uzi ({city}): {e}")
            with Session(engine) as session:
                log_parser_execution(session, url, "error", str(e))


async def run():
    Base.metadata.create_all(engine)
    # 1-2 потока идеальны для Инвитро, чтобы куки городов на бэкенде не пересекались
    semaphore = asyncio.Semaphore(1) 

    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, verify=False) as client:
        tasks = []
        for city in CITIES:
            tasks.append(fetch_city(city, client, semaphore))
            tasks.append(fetch_uzi(city, client, semaphore))
        
        print(f"[*] Запускаем парсинг Инвитро — {len(tasks)} задач...")
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(run())