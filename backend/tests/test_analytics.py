import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.usefixtures("dataset")

PERIOD = {"dateFrom": "2026-03-09", "dateTo": "2026-03-10"}


async def test_kpi_whole_network(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/kpi", params=PERIOD)

    assert response.status_code == 200
    assert response.json() == {
        "revenue": {"value": 8400, "previous": 3100, "deltaPct": 171.0},
        "ordersCount": {"value": 3, "previous": 2, "deltaPct": 50.0},
        "avgCheck": {"value": 2800, "previous": 1550, "deltaPct": 80.6},
        "bestProduct": {"id": 1, "name": "Капучино", "quantity": 3, "orderSharePct": 66.7, "deltaPct": 200.0},
    }


async def test_kpi_for_location(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/kpi", params={**PERIOD, "locationId": 2})

    body = response.json()
    assert body["revenue"] == {"value": 1600, "previous": 0, "deltaPct": None}
    assert body["ordersCount"]["value"] == 1
    assert body["bestProduct"]["name"] == "Латте"


async def test_kpi_empty_period(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/analytics/kpi", params={"dateFrom": "2025-01-01", "dateTo": "2025-01-07"}
    )

    body = response.json()
    assert body["revenue"] == {"value": 0, "previous": 0, "deltaPct": None}
    assert body["avgCheck"]["value"] == 0
    assert body["bestProduct"] is None


async def test_revenue_daily_aligns_previous_period(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/revenue-daily", params=PERIOD)

    assert response.json() == [
        {"date": "2026-03-09", "revenue": 6800, "ordersCount": 2, "previousRevenue": 1600},
        {"date": "2026-03-10", "revenue": 1600, "ordersCount": 1, "previousRevenue": 1500},
    ]


async def test_top_products(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/top-products", params={**PERIOD, "limit": 2})

    assert response.json() == [
        {
            "productId": 1,
            "name": "Капучино",
            "categoryId": 1,
            "categoryColor": "#E05A2B",
            "quantity": 3,
            "revenue": 4500,
        },
        {
            "productId": 2,
            "name": "Латте",
            "categoryId": 1,
            "categoryColor": "#E05A2B",
            "quantity": 1,
            "revenue": 1600,
        },
    ]


async def test_category_share(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/category-share", params=PERIOD)

    body = response.json()
    assert body["totalRevenue"] == 8400
    assert [(i["name"], i["revenue"], i["sharePct"]) for i in body["items"]] == [
        ("Кофе", 6100, 72.6),
        ("Десерты", 2300, 27.4),
    ]


async def test_heatmap(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/heatmap", params=PERIOD)

    cells = {(c["weekday"], c["hour"]): c["avgOrders"] for c in response.json()}
    assert len(cells) == 2 * 16  # Mon and Tue, hours 7..22
    assert cells[(0, 8)] == 2.0
    assert cells[(1, 13)] == 1.0  # the cancelled order at 13:30 is not counted
    assert sum(cells.values()) == 3.0


async def test_locations_compare_ignores_location_filter(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/locations-compare", params={**PERIOD, "locationId": 1})

    assert response.json() == [
        {
            "locationId": 1,
            "name": "Центр",
            "revenue": 6800,
            "ordersCount": 2,
            "avgCheck": 3400,
            "deltaPct": 119.4,
        },
        {
            "locationId": 2,
            "name": "Университет",
            "revenue": 1600,
            "ordersCount": 1,
            "avgCheck": 1600,
            "deltaPct": None,
        },
    ]


async def test_invalid_period(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/analytics/kpi", params={"dateFrom": "2026-03-10", "dateTo": "2026-03-01"}
    )

    assert response.status_code == 422
