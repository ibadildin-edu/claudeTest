from datetime import datetime, time

from sqlalchemy import CheckConstraint, DateTime, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (CheckConstraint("opens_at < closes_at", name="opening_hours"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)
    address: Mapped[str] = mapped_column(String(255))
    opens_at: Mapped[time] = mapped_column(Time)
    closes_at: Mapped[time] = mapped_column(Time)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
