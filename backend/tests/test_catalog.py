import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.usefixtures("dataset")


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")

    assert response.json() == {"status": "ok", "database": "ok"}


async def test_categories(client: AsyncClient) -> None:
    response = await client.get("/api/v1/categories")

    assert [(c["name"], c["color"], c["sortOrder"]) for c in response.json()] == [
        ("Кофе", "#E05A2B", 1),
        ("Десерты", "#A2452F", 2),
    ]


async def test_product_lifecycle(client: AsyncClient) -> None:
    created = await client.post("/api/v1/products", json={"categoryId": 2, "name": "Брауни", "price": 1300})
    assert created.status_code == 201
    product = created.json()
    assert product["isActive"] is True

    updated = await client.patch(f"/api/v1/products/{product['id']}", json={"price": 1400})
    assert updated.json()["price"] == 1400

    deleted = await client.delete(f"/api/v1/products/{product['id']}")
    assert deleted.status_code == 204

    fetched = await client.get(f"/api/v1/products/{product['id']}")
    assert fetched.json()["isActive"] is False
    active = await client.get("/api/v1/products")
    assert "Брауни" not in [p["name"] for p in active.json()]
    everything = await client.get("/api/v1/products", params={"includeInactive": "true"})
    assert "Брауни" in [p["name"] for p in everything.json()]


@pytest.mark.parametrize(
    ("payload", "status_code"),
    [
        ({"categoryId": 1, "name": "Капучино", "price": 1500}, 409),
        ({"categoryId": 1, "name": "Новый", "price": 0}, 422),
        ({"categoryId": 99, "name": "Новый", "price": 1000}, 404),
        ({"categoryId": 1, "name": "   ", "price": 1000}, 422),
    ],
)
async def test_create_product_validation(
    client: AsyncClient, payload: dict[str, object], status_code: int
) -> None:
    response = await client.post("/api/v1/products", json=payload)

    assert response.status_code == status_code


async def test_rename_product_to_existing_name(client: AsyncClient) -> None:
    response = await client.patch("/api/v1/products/2", json={"name": "Капучино"})

    assert response.status_code == 409


async def test_list_products_filters(client: AsyncClient) -> None:
    by_category = await client.get("/api/v1/products", params={"categoryId": 2})
    by_search = await client.get("/api/v1/products", params={"search": "лат"})

    assert [p["name"] for p in by_category.json()] == ["Чизкейк"]
    assert [p["name"] for p in by_search.json()] == ["Латте"]


async def test_location_lifecycle(client: AsyncClient) -> None:
    payload = {
        "name": "Аэропорт",
        "slug": "airport",
        "address": "ул. 3",
        "opensAt": "06:00",
        "closesAt": "23:00",
    }
    created = await client.post("/api/v1/locations", json=payload)
    assert created.status_code == 201
    location_id = created.json()["id"]

    duplicate = await client.post("/api/v1/locations", json=payload)
    assert duplicate.status_code == 409

    updated = await client.patch(f"/api/v1/locations/{location_id}", json={"closesAt": "22:00"})
    assert updated.json()["closesAt"] == "22:00:00"

    bad_hours = await client.patch(f"/api/v1/locations/{location_id}", json={"opensAt": "23:00"})
    assert bad_hours.status_code == 422

    deleted = await client.delete(f"/api/v1/locations/{location_id}")
    assert deleted.status_code == 204
    assert (await client.get(f"/api/v1/locations/{location_id}")).status_code == 404


async def test_location_with_orders_cannot_be_deleted(client: AsyncClient) -> None:
    response = await client.delete("/api/v1/locations/1")

    assert response.status_code == 409
