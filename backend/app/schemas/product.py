from datetime import datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.schemas.base import CamelModel

ProductName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Price = Annotated[int, Field(gt=0, le=1_000_000)]


class ProductRead(CamelModel):
    id: int
    category_id: int
    name: str
    price: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductCreate(CamelModel):
    category_id: int
    name: ProductName
    price: Price
    is_active: bool = True


class ProductUpdate(CamelModel):
    category_id: int | None = None
    name: ProductName | None = None
    price: Price | None = None
    is_active: bool | None = None
