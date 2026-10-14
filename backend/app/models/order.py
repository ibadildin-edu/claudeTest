import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.location import Location
from app.models.product import Product


class OrderStatus(enum.StrEnum):
    PREPARING = "preparing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_location_id_created_at", "location_id", "created_at"),
        CheckConstraint("total_amount >= 0", name="total_amount_non_negative"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", values_callable=lambda e: [m.value for m in e]),
        default=OrderStatus.PREPARING,
        index=True,
    )
    total_amount: Mapped[int] = mapped_column(Integer)
    items_count: Mapped[int] = mapped_column(SmallInteger)

    location: Mapped[Location] = relationship(lazy="raise")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", lazy="raise", cascade="all, delete-orphan", order_by="OrderItem.id"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price > 0", name="unit_price_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True)
    quantity: Mapped[int] = mapped_column(SmallInteger)
    unit_price: Mapped[int] = mapped_column(Integer)
    line_total: Mapped[int] = mapped_column(Integer)

    order: Mapped[Order] = relationship(back_populates="items", lazy="raise")
    product: Mapped[Product] = relationship(lazy="raise")
