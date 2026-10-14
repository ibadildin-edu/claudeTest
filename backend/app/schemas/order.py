from datetime import date, datetime
from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from app.models import OrderStatus
from app.schemas.base import CamelModel


class OrderSort(StrEnum):
    CREATED_AT_DESC = "-createdAt"
    CREATED_AT_ASC = "createdAt"
    TOTAL_DESC = "-totalAmount"
    TOTAL_ASC = "totalAmount"
    ID_DESC = "-id"
    ID_ASC = "id"


class OrderFilters(CamelModel):
    location_id: int | None = None
    status: OrderStatus | None = None
    date_from: date | None = None
    date_to: date | None = None
    product_id: int | None = None
    category_id: int | None = None
    min_total: int | None = Field(default=None, ge=0)
    max_total: int | None = Field(default=None, ge=0)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort: OrderSort = OrderSort.CREATED_AT_DESC

    @model_validator(mode="after")
    def check_ranges(self) -> Self:
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("dateFrom must not be later than dateTo")
        if self.min_total is not None and self.max_total is not None and self.min_total > self.max_total:
            raise ValueError("minTotal must not be greater than maxTotal")
        return self


class OrderListItem(CamelModel):
    id: int
    location_id: int
    location_name: str
    created_at: datetime
    status: OrderStatus
    total_amount: int
    items_count: int
    items_summary: str


class OrderItemRead(CamelModel):
    id: int
    product_id: int
    product_name: str
    category_id: int
    quantity: int
    unit_price: int
    line_total: int


class OrderRead(CamelModel):
    id: int
    location_id: int
    location_name: str
    created_at: datetime
    status: OrderStatus
    total_amount: int
    items_count: int
    items: list[OrderItemRead]
