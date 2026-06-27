import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric,
    DateTime, Text, ForeignKey, Enum as SAEnum, create_engine
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

import codecs
codecs.register(lambda name: codecs.lookup('cp1251') if name == 'utf-8' else None)

Base = declarative_base()


class ServiceCategory(str, enum.Enum):
    laboratory  = "laboratory"
    doctor      = "doctor"
    diagnostics = "diagnostics"
    procedure   = "procedure"


# Словарь меток для API-ответов и фронтенда
# Фронт получает: {"category": "laboratory", "category_label": "Лаборатория"}
CATEGORY_LABELS: dict[str, str] = {
    "laboratory":   "Лаборатория",
    "doctor":       "Приём врача",
    "diagnostics":  "Диагностика",
    "procedure":    "Процедура",
}


# ─────────────────────────────────────────────
# Справочник нормализованных услуг
# ─────────────────────────────────────────────
class ServiceCatalog(Base):
    """
    Эталонный справочник услуг.
    Пример: id=..., name='Общий анализ крови (ОАК)', synonyms='ОАК,CBC,Клинический анализ крови'
    """
    __tablename__ = "service_catalog"

    id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name     = Column(String(255), nullable=False, unique=True)   # нормализованное название
    synonyms = Column(Text, nullable=True)                         # через запятую
    category = Column(SAEnum(ServiceCategory), nullable=False)

    prices = relationship("Price", back_populates="catalog_service")


# ─────────────────────────────────────────────
# Клиники
# ─────────────────────────────────────────────
class Clinic(Base):
    __tablename__ = "clinics"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(255), nullable=False)      # "КДЛ Олимп"
    city       = Column(String(100), nullable=False)      # "Астана"
    source_url = Column(String(1000), nullable=False)     # "https://www.kdlolymp.kz"

    # Связи
    prices   = relationship("Price", back_populates="clinic")
    
    # Главная фишка: у ОДНОЙ клиники может быть МНОГО филиалов
    branches = relationship("ClinicBranch", back_populates="clinic", cascade="all, delete-orphan")

# ─────────────────────────────────────────────
# АДРЕСА
# ─────────────────────────────────────────────
class ClinicBranch(Base):
    __tablename__ = "clinic_branches"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Внешний ключ: указывает, к какому бренду относится этот адрес
    clinic_id     = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    
    address       = Column(String(500), nullable=False)   # "ул. Мангилик Ел, 19"
    phone         = Column(String(50),  nullable=True)    # "+7 (7172) 59-79-69"
    working_hours = Column(String(1000), nullable=True)    # "Пн-Пт: 07:30-17:00"

    clinic = relationship("Clinic", back_populates="branches")


# ─────────────────────────────────────────────
# Сырые данные (raw-слой)
# ─────────────────────────────────────────────
class RawPrice(Base):
    """
    Хранит данные как они пришли с сайта, без нормализации.
    Хранится минимум 90 дней (по ТЗ).
    """
    __tablename__ = "raw_prices"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_name_raw  = Column(String(255), nullable=False)
    service_name_raw = Column(String(500), nullable=False)
    price_raw        = Column(String(100), nullable=True)   # как на сайте, до конвертации
    currency_raw     = Column(String(10),  nullable=True)
    source_url       = Column(String(1000), nullable=False)
    parsed_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_matched       = Column(Boolean, default=False)       # привязана ли к нормализованной


# ─────────────────────────────────────────────
# Нормализованные цены (основная таблица поиска)
# ─────────────────────────────────────────────
class Price(Base):
    __tablename__ = "prices"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id           = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    service_id          = Column(UUID(as_uuid=True), ForeignKey("service_catalog.id"), nullable=True)

    service_name_raw    = Column(String(500), nullable=False)   # оригинальное название с сайта
    service_name_norm   = Column(String(500), nullable=True)    # нормализованное

    category            = Column(SAEnum(ServiceCategory), nullable=True)
    price_kzt           = Column(Numeric(12, 2), nullable=True)
    currency            = Column(String(10), default="KZT", nullable=False)
    duration_days       = Column(Integer, nullable=True)        # срок выполнения (для анализов)

    parsed_at           = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active           = Column(Boolean, default=True, nullable=False)

    clinic          = relationship("Clinic", back_populates="prices")
    catalog_service = relationship("ServiceCatalog", back_populates="prices")
    

# ─────────────────────────────────────────────
# Очередь ненормализованных услуг
# ─────────────────────────────────────────────
class UnmatchedQueue(Base):
    """
    Услуги, которые rapidfuzz не смог сопоставить со справочником.
    Требуют ручной разметки.
    """
    __tablename__ = "unmatched_queue"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_name_raw = Column(String(500), nullable=False)
    source_url       = Column(String(1000), nullable=False)
    clinic_name      = Column(String(255), nullable=True)
    parsed_at        = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_resolved      = Column(Boolean, default=False)


# ─────────────────────────────────────────────
# Журнал ошибок парсинга
# ─────────────────────────────────────────────
class ParserLog(Base):
    """
    Логирование ошибок парсинга с указанием источника (по ТЗ).
    """
    __tablename__ = "parser_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    source_url = Column(String(1000), nullable=False)
    error_msg  = Column(Text, nullable=True)
    status     = Column(String(50), default="error")   # success / error / skipped
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at= Column(DateTime(timezone=True), nullable=True)


# ─────────────────────────────────────────────
# Создание всех таблиц
# ─────────────────────────────────────────────
def create_tables(database_url: str):
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    print("✅ Все таблицы созданы успешно")
    return engine


if __name__ == "__main__":
    from config import settings
    create_tables(settings.DATABASE_URL_sync)