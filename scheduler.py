"""
scheduler.py — автоматический запуск парсеров по расписанию.

Расписание:
  - КДЛ Олимп  — каждый день в 02:00
  - Инвитро    — каждый день в 03:00
  - Нормализация — каждый день в 05:00 (после всех парсеров)
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

# Настраиваем логирование — пишем в файл и в консоль одновременно
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("scheduler.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


# ─── Обёртки для запуска async-парсеров из sync-планировщика ─────────────────

def run_kdl():
    log.info("=== Старт парсера КДЛ Олимп ===")
    try:
        from back.parsers.kdl_olymp import run
        asyncio.run(run())
        log.info("=== КДЛ Олимп завершён ===")
    except Exception as e:
        log.error(f"КДЛ Олимп — ошибка: {e}", exc_info=True)


def run_invitro():
    log.info("=== Старт парсера Инвитро ===")
    try:
        from back.parsers.invitro import run
        asyncio.run(run())
        log.info("=== Инвитро завершён ===")
    except Exception as e:
        log.error(f"Инвитро — ошибка: {e}", exc_info=True)


def run_normalizer():
    log.info("=== Старт нормализации ===")
    try:
        from back.app.normalizer import run_normalization
        run_normalization()
        log.info("=== Нормализация завершена ===")
    except Exception as e:
        log.error(f"Нормализация — ошибка: {e}", exc_info=True)


def run_all():
    """Запускает все парсеры последовательно + нормализацию."""
    log.info("====== Полный цикл обновления данных ======")
    run_kdl()
    run_invitro()
    run_normalizer()
    log.info(f"====== Цикл завершён: {datetime.now().strftime('%Y-%m-%d %H:%M')} ======")


# ─── Планировщик ──────────────────────────────────────────────────────────────

def main():
    scheduler = BlockingScheduler(timezone="Asia/Almaty")

    # Каждый парсер в своё время, чтобы не нагружать сайты одновременно
    scheduler.add_job(
        run_kdl,
        trigger=CronTrigger(hour=2, minute=0),
        id="kdl",
        name="Парсер КДЛ Олимп",
        max_instances=1,        # не запускать повторно если предыдущий ещё идёт
        misfire_grace_time=600, # если пропустили время — запустить в течение 10 минут
    )

    scheduler.add_job(
        run_invitro,
        trigger=CronTrigger(hour=3, minute=0),
        id="invitro",
        name="Парсер Инвитро",
        max_instances=1,
        misfire_grace_time=600,
    )

    scheduler.add_job(
        run_normalizer,
        trigger=CronTrigger(hour=5, minute=0),
        id="normalizer",
        name="Нормализация данных",
        max_instances=1,
        misfire_grace_time=600,
    )

    # Выводим расписание при старте
    log.info("Планировщик запущен. Расписание (Asia/Almaty):")
    for job in scheduler.get_jobs():
        log.info(f"  {job.name}: {job.trigger}")

    log.info("Для немедленного запуска всех парсеров: python scheduler.py --now")

    try:
        scheduler.start()
    except KeyboardInterrupt:
        log.info("Планировщик остановлен вручную.")


# ─── CLI: запуск немедленно для теста ────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if "--now" in sys.argv:
        # Запустить всё прямо сейчас (удобно для теста на хакатоне)
        log.info("Режим --now: запускаем все парсеры немедленно")
        run_all()
    elif "--kdl" in sys.argv:
        run_kdl()
    elif "--invitro" in sys.argv:
        run_invitro()
    elif "--normalize" in sys.argv:
        run_normalizer()
    else:
        main()