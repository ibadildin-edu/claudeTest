import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.usefixtures("dataset")


async def test_list_orders_default_sort_and_summary(client: AsyncClient) -> None:
    response = await client.get("/api/v1/orders", params={"pageSize": 3})

    body = response.json()
    assert body["total"] == 7
    assert body["page"] == 1
    assert body["pageSize"] == 3
    assert [o["id"] for o in body["items"]] == [7, 6, 5]
    assert body["items"][2]["locationName"] == "Университет"


async def test_list_orders_period_uses_local_dates(client: AsyncClient) -> None:
    response = await client.get("/api/v1/orders", params={"dateFrom": "2026-03-09", "dateTo": "2026-03-10"})

    assert sorted(o["id"] for o in response.json()["items"]) == [3, 4, 5, 6]


@pytest.mark.parametrize(
    ("params", "expected_ids"),
    [
        ({"categoryId": 2}, [6, 4]),
        ({"productId": 1}, [4, 3, 2]),
        ({"status": "cancelled"}, [6]),
        ({"locationId": 2}, [6, 5]),
        ({"minTotal": 3000, "maxTotal": 3800}, [4, 3]),
    ],
)
async def test_list_orders_filters(
    client: AsyncClient, params: dict[str, object], expected_ids: list[int]
) -> None:
    response = await client.get("/api/v1/orders", params=params)

    assert [o["id"] for o in response.json()["items"]] == expected_ids


async def test_list_orders_pagination_and_sort(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/orders", params={"locationId": 1, "page": 2, "pageSize": 2, "sort": "-totalAmount"}
    )

    body = response.json()
    assert body["total"] == 5
    assert [o["totalAmount"] for o in body["items"]] == [1600, 1600]


async def test_items_summary(client: AsyncClient) -> None:
    response = await client.get("/api/v1/orders", params={"dateFrom": "2026-03-09", "dateTo": "2026-03-09"})

    summaries = {o["id"]: o["itemsSummary"] for o in response.json()["items"]}
    assert summaries == {3: "Капучино ×2", 4: "Капучино, Чизкейк"}


async def test_invalid_filters(client: AsyncClient) -> None:
    bad_dates = await client.get("/api/v1/orders", params={"dateFrom": "2026-03-10", "dateTo": "2026-03-01"})
    bad_page = await client.get("/api/v1/orders", params={"pageSize": 1000})

    assert bad_dates.status_code == 422
    assert bad_page.status_code == 422


async def test_get_order(client: AsyncClient) -> None:
    response = await client.get("/api/v1/orders/4")

    body = response.json()
    assert body["totalAmount"] == 3800
    assert [(i["productName"], i["quantity"], i["lineTotal"]) for i in body["items"]] == [
        ("Капучино", 1, 1500),
        ("Чизкейк", 1, 2300),
    ]


async def test_get_order_not_found(client: AsyncClient) -> None:
    response = await client.get("/api/v1/orders/999")

    assert response.status_code == 404
