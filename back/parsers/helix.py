import asyncio
import logging
from bs4 import BeautifulSoup
import httpx

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from back.app.config import settings
from back.app.db_service import save_parsed_data, log_parser_execution

logger = logging.getLogger(__name__)

HELIX_CITIES = {
    "almaty": "almaty",
    "astana": "astana",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
}

engine = create_engine(settings.DATABASE_URL_sync)

async def fetch_helix_page(client: httpx.AsyncClient, city: str, page: int) -> str | None:
    url = f"https://helix.ru/{city}/catalog/190-vse-analizy"
    params = {"page": page}
    try:
        response = await client.get(url, params=params, headers=HEADERS, timeout=15.0)
        if response.status_code == 200:
            return response.text
        elif response.status_code == 404:
            logger.warning(f"[Helix] Страница {page} вернула 404 для города {city}. Финиш.")
            return None
        return None
    except Exception as e:
        logger.error(f"[Helix] Сетевая ошибка на странице {page}: {e}")
        return None

def parse_helix_html(html_content: str) -> list[dict]:
    soup = BeautifulSoup(html_content, "html.parser")
    analyzes = []
    items = soup.find_all("app-catalog-list-item")
    
    for item in items:
        try:
            link_tag = item.find("a", class_="card-hoverable")
            if not link_tag or not link_tag.get("href"):
                continue
            href = link_tag["href"]
            sku = href.split("/")[-1] 
            
            title_tag = item.find("div", class_="typography-headline")
            title = title_tag.text.strip() if title_tag else "Без названия"
            
            price_tag = item.find("span", class_=lambda c: c and "typography-bold" in c and "nowrap" in c)
            if not price_tag:
                price_tag = item.find(lambda tag: tag.name == "span" and "₸" in tag.text)
                
            if price_tag:
                price_text = price_tag.text.replace("₸", "").replace("\xa0", "").strip()
                price = float(price_text)
            else:
                price = 0.0

            analyzes.append({
                "sku": sku,
                "title": title,
                "price": price,
                "link": f"https://helix.ru{href}"
            })
        except Exception as e:
            logger.error(f"[Helix] Ошибка при парсинге карточки: {e}")
            continue
            
    return analyzes

async def parse_helix_city(city_key: str, client: httpx.AsyncClient, semaphore: asyncio.Semaphore):
    city_slug = HELIX_CITIES[city_key]
    page = 1
    total_parsed = 0
    
    # Метаданные клиники/лаборатории для Helix
    clinic_meta = {
        "name": "Helix",
        "city": city_key,
        "type": "laboratory"
    }
    
    async with semaphore:
        logger.info(f"[*] Начало парсинга Helix для города: {city_key}")
        
        while True:
            # Формируем source_url для логов и трекинга, включая страницу
            source_url = f"https://helix.ru/{city_slug}/catalog/190-vse-analizy?page={page}"
            
            logger.info(f"[Helix] Парсим страницу {page} для {city_key}...")
            html = await fetch_helix_page(client, city_slug, page)
            
            if not html:
                break
                
            data = parse_helix_html(html)
            
            # Если анализов на странице нет — выходим из цикла
            if not data:
                logger.info(f"[✓] Helix {city_key}: Страницы закончились на номере {page}.")
                break
            
            # --- Блок сохранения в БД в твоем стиле ---
            try:
                with Session(engine) as session:
                    # Передаем спарсенные анализы страницы, метаданные и URL источника
                    save_parsed_data(session, data, clinic_meta, source_url)
                    
                    # Логируем успешный проход страницы в БД
                    log_parser_execution(session, source_url, "success")
                
                logger.info(f"  [+] Helix {city_key}/page-{page}: сохранено {len(data)} анализов")
                
            except Exception as e:
                logger.error(f"  [-] Helix {city_key}/page-{page} — ошибка БД: {e}")
                try:
                    with Session(engine) as session:
                        log_parser_execution(session, source_url, "error", str(e))
                except Exception:
                    pass
            # ------------------------------------------
            
            total_parsed += len(data)
            page += 1
            
            # Спим секунду между страницами, чтобы Helix не забанил по IP
            await asyncio.sleep(1.0)

async def run():
    """Главная точка входа для планировщика."""
    semaphore = asyncio.Semaphore(3)  
    async with httpx.AsyncClient() as client:
        tasks = [parse_helix_city(city, client, semaphore) for city in HELIX_CITIES.keys()]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(run())