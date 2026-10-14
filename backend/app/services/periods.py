from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def local_day_start(day: date, tz: ZoneInfo) -> datetime:
    """Start of a local calendar day as an aware datetime (asyncpg converts it to UTC)."""
    return datetime.combine(day, time.min, tzinfo=tz)


@dataclass(frozen=True)
class Period:
    """Inclusive range of local dates plus the previous range of the same length."""

    date_from: date
    date_to: date
    tz: ZoneInfo

    @classmethod
    def resolve(
        cls, date_from: date | None, date_to: date | None, tz: ZoneInfo, default_days: int = 30
    ) -> "Period":
        end = date_to or datetime.now(tz).date()
        start = date_from or end - timedelta(days=default_days - 1)
        return cls(start, end, tz)

    @property
    def days(self) -> int:
        return (self.date_to - self.date_from).days + 1

    @property
    def prev_from(self) -> date:
        return self.date_from - timedelta(days=self.days)

    @property
    def prev_to(self) -> date:
        return self.date_from - timedelta(days=1)

    @property
    def start(self) -> datetime:
        return local_day_start(self.date_from, self.tz)

    @property
    def end(self) -> datetime:
        """Exclusive upper bound."""
        return local_day_start(self.date_to + timedelta(days=1), self.tz)

    @property
    def prev_start(self) -> datetime:
        return local_day_start(self.prev_from, self.tz)
