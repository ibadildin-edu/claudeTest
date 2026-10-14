from datetime import datetime, time
from typing import Annotated, Self

from pydantic import Field, StringConstraints, model_validator

from app.schemas.base import CamelModel

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Slug = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[a-z0-9-]+$", max_length=50)]
Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class LocationRead(CamelModel):
    id: int
    name: str
    slug: str
    address: str
    opens_at: time
    closes_at: time
    created_at: datetime


class LocationCreate(CamelModel):
    name: Name
    slug: Slug
    address: Address
    opens_at: time = Field(default=time(7, 0))
    closes_at: time = Field(default=time(22, 0))

    @model_validator(mode="after")
    def check_hours(self) -> Self:
        if self.opens_at >= self.closes_at:
            raise ValueError("opensAt must be earlier than closesAt")
        return self


class LocationUpdate(CamelModel):
    name: Name | None = None
    slug: Slug | None = None
    address: Address | None = None
    opens_at: time | None = None
    closes_at: time | None = None

    @model_validator(mode="after")
    def check_hours(self) -> Self:
        if self.opens_at and self.closes_at and self.opens_at >= self.closes_at:
            raise ValueError("opensAt must be earlier than closesAt")
        return self
