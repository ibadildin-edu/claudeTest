from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.category import Category


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("price > 0", name="price_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    price: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category] = relationship(lazy="raise")
