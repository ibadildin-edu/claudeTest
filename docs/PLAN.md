# CoffeeMetrics — план проекта

Учебный full-stack проект: аналитический дашборд для сети из трёх кофеен (Центр, Университет, Набережная).
Прототип интерфейса — [`design/dashboard.png`](../design/dashboard.png).

**Стек.** PostgreSQL 16 (Docker) · Python 3.12, FastAPI, SQLAlchemy 2.0 async + asyncpg, Alembic, Pydantic v2, uv ·
Vite + React + TypeScript, Redux Toolkit + RTK Query, React Router, Recharts, react-hook-form + zod, Tailwind CSS.

## Принятые решения

- **Live-лента «Последние заказы»**: у заказа есть статус, фронтенд опрашивает сервер через RTK Query `pollingInterval`
  (5–10 с, только при включённом Live). Новые заказы создаёт отдельный скрипт-симулятор.
- **Авторизации нет**: все эндпоинты открыты.
- **Тесты**: pytest + httpx на бэкенде (отдельная тестовая БД `coffeemetrics_test`), Vitest + Testing Library на фронтенде.
- **Сравнение точек** — отдельная карточка на дашборде под тепловой картой.
- Валюта — тенге (₸), суммы храним **целыми числами** (`INTEGER`/`BIGINT`), без копеек.
- Время храним в UTC (`timestamptz`). Аналитику (дни, часы, дни недели) считаем в зоне `Asia/Almaty` (настройка `APP_TIMEZONE`).
- **Сидим 180 дней**: KPI и график сравнивают текущие 90 дней с предыдущими 90. Последний день — сегодня до текущего часа.
- JSON API в camelCase (Pydantic `alias_generator=to_camel`), в Python-коде — snake_case.
- Бэкенд и фронтенд запускаем локально, в Docker только Postgres. Vite проксирует `/api` на `localhost:8000`.
- Пакетный менеджер фронтенда — npm.

## 1. Структура репозитория

```
collegeProjectClaude/
├── CLAUDE.md                  # правила проекта для Claude
├── docker-compose.yml         # Postgres 16
├── .gitignore
├── design/dashboard.png       # прототип
├── docs/PLAN.md               # этот план
├── docker/postgres/init/
│   └── 01-create-test-db.sql  # создаёт coffeemetrics_test при первом старте
├── backend/
│   ├── pyproject.toml, uv.lock, alembic.ini, .env.example   (шаг «бэкенд»)
│   ├── alembic/               # создаст `alembic init -t async` (сейчас папку НЕ создаём)
│   ├── app/
│   │   ├── main.py            # create_app(), CORS, подключение роутеров
│   │   ├── core/              # config.py (pydantic-settings), db.py (engine, sessionmaker, get_session)
│   │   ├── models/            # SQLAlchemy-модели (Mapped[...])
│   │   ├── schemas/           # Pydantic v2 схемы запросов/ответов
│   │   ├── services/          # бизнес-логика и SQL-агрегации
│   │   ├── api/v1/            # роутеры: locations, categories, products, orders, analytics; deps.py
│   │   └── scripts/           # seed.py, simulate.py
│   └── tests/
└── frontend/
    ├── package.json, vite.config.ts, tailwind.config.ts, tsconfig*.json   (шаг «фронтенд»)
    └── src/
        ├── app/               # store.ts, hooks.ts, router.tsx
        ├── api/               # baseApi.ts + endpoints (injectEndpoints)
        ├── features/filters/  # filtersSlice.ts
        ├── layouts/           # AppLayout.tsx (Sidebar + <Outlet/>)
        ├── pages/             # страницы-маршруты
        ├── components/        # ui/, charts/, dashboard/, orders/, menu/
        ├── lib/               # format.ts, dates.ts
        └── schemas/           # zod-схемы форм
```

Пустые папки на этом шаге держим через `.gitkeep`.

---

## 2. Схема БД

Цены и суммы — целые ₸. Отменённые заказы (`cancelled`) в аналитике не учитываются.

**locations**
| поле | тип | примечание |
|---|---|---|
| id | serial PK | |
| name | varchar(100) unique | «Центр», «Университет», «Набережная» |
| slug | varchar(50) unique | `center`, `university`, `embankment` |
| address | varchar(255) | |
| opens_at / closes_at | time | 07:00 / 22:00 (в сайдбаре «до 22:00») |
| created_at | timestamptz | default now() |

**categories**
| поле | тип | примечание |
|---|---|---|
| id | serial PK | |
| name | varchar(50) unique | Кофе, Чай, Выпечка, Десерты |
| color | varchar(7) | hex для графиков (цвета из макета) |
| sort_order | smallint | |

**products**
| поле | тип | примечание |
|---|---|---|
| id | serial PK | |
| category_id | FK → categories, RESTRICT | index |
| name | varchar(100) unique | |
| price | integer, CHECK > 0 | текущая цена, ₸ |
| is_active | boolean default true | «удаление» — мягкое, иначе сломаются старые заказы |
| created_at / updated_at | timestamptz | |

**orders**
| поле | тип | примечание |
|---|---|---|
| id | bigserial PK | показываем как `#18469` |
| location_id | FK → locations, RESTRICT | |
| created_at | timestamptz | |
| status | enum `order_status` (`preparing`, `completed`, `cancelled`) | «Готовится» / «Выдан» / «Отменён» |
| total_amount | integer | денормализация: сумма позиций, чтобы агрегаты не джойнили items |
| items_count | smallint | |

Индексы: `(location_id, created_at)`, `(created_at)`, `(status)`.

**order_items**
| поле | тип | примечание |
|---|---|---|
| id | bigserial PK | |
| order_id | FK → orders, CASCADE | index |
| product_id | FK → products, RESTRICT | index |
| quantity | smallint, CHECK > 0 | |
| unit_price | integer | снимок цены на момент заказа |
| line_total | integer | quantity × unit_price |

---

## 3. API (`/api/v1`)

Общие параметры аналитики: `dateFrom`, `dateTo` (даты `YYYY-MM-DD` включительно, в зоне Алматы),
`locationId` (необязательный, без него — вся сеть). «Предыдущий период» — отрезок такой же длины прямо перед текущим.

### Справочники и CRUD
| метод | путь | описание |
|---|---|---|
| GET | `/health` | проверка API и БД |
| GET | `/locations` | список точек |
| GET | `/locations/{id}` | карточка точки |
| GET | `/categories` | категории с цветами |
| GET | `/products` | `?categoryId&search&includeInactive` |
| GET | `/products/{id}` | |
| POST | `/products` | создание (валидация: цена > 0, имя уникально) |
| PATCH | `/products/{id}` | частичное обновление |
| DELETE | `/products/{id}` | мягкое удаление (`is_active=false`), 204 |

### Заказы
| метод | путь | описание |
|---|---|---|
| GET | `/orders` | таблица: `?locationId&status&dateFrom&dateTo&productId&minTotal&maxTotal&page&pageSize&sort` → `{items, total, page, pageSize}`. В `items` есть краткий список позиций («Капучино, Круассан») |
| GET | `/orders/{id}` | заказ с позициями |
| GET | `/orders/recent` | Live-лента: `?locationId&limit=20` → `{today: {ordersCount, revenue}, orders: [...]}` |

### Аналитика (агрегаты для графиков)
| метод | путь | ответ |
|---|---|---|
| GET | `/analytics/kpi` | `revenue`, `ordersCount`, `avgCheck` — у каждого `{value, previous, deltaPct}`; `bestProduct {id, name, quantity, orderSharePct, deltaPct}` |
| GET | `/analytics/revenue-daily` | `[{date, revenue, ordersCount, previousRevenue}]`: предыдущий период выровнен по номеру дня, для пунктирной линии |
| GET | `/analytics/top-products` | `?limit=10` → `[{productId, name, categoryId, categoryColor, quantity, revenue}]` |
| GET | `/analytics/category-share` | `[{categoryId, name, color, revenue, sharePct}]` + `totalRevenue` |
| GET | `/analytics/heatmap` | `[{weekday 0–6, hour 7–22, avgOrders}]`: число заказов, делённое на количество таких дней недели в периоде |
| GET | `/analytics/locations-compare` | `[{locationId, name, revenue, ordersCount, avgCheck, deltaPct}]` (параметр `locationId` игнорируется) |

Все агрегаты — SQL в `services/analytics.py` (`date_trunc`/`extract` по `created_at AT TIME ZONE :tz`). Ничего не считаем в Python-циклах.

---

## 4. Сидирование и симулятор

`uv run python -m app.scripts.seed [--days 180] [--seed 42] [--reset]`
- Справочники: 3 точки, 4 категории, ~20–25 позиций (кофе, чай, выпечка, десерты) с ценами 900–2500 ₸.
- Профиль точек:
  - **Центр** — офисы: сильный утренний пик 8–9, обед 12–14, в выходные на ~40% меньше заказов, средний чек выше среднего.
  - **Университет** — студенты: пики 8–10 и 12–14, низкий чек, в выходные заказов мало.
  - **Набережная** — прогулочная: в будни умеренно, в выходные пик 11–18 в 1,5–2 раза выше, высокий чек (десерты).
- Число заказов в час — Пуассон от функции: базовое число заказов точки × почасовой профиль (смесь гауссиан) × день недели × тренд (+~10% за период) × шум.
  Самые загруженные часы точки дают ~16–25 заказов в час.
- Корзина: 1–4 позиции. Веса категорий зависят от часа (утром кофе + выпечка, днём больше десертов и чая).
- Статусы: исторические заказы — `completed`, ~1–2% — `cancelled`.
- Вставка через asyncpg `copy_records_to_table`: ~120 тыс. заказов и ~250 тыс. позиций за секунды. RNG с фиксированным seed, данные воспроизводимы.

`uv run python -m app.scripts.simulate [--interval 8]`: раз в N секунд создаёт заказ в случайной точке
со статусом `preparing`, через 1–3 минуты переводит его в `completed`.

---

## 5. Фронтенд

### Маршруты (React Router, data router, общий layout)
```
/                       AppLayout (Sidebar + <Outlet/>)
├── index               DashboardPage
├── orders              OrdersPage (фильтры и страница — в URL search params)
│   └── :orderId        OrderDrawer (вложенный маршрут, боковая панель поверх таблицы)
├── menu                MenuPage
│   ├── new             ProductFormModal
│   └── :productId/edit ProductFormModal
├── locations           LocationsPage
│   └── :locationId     LocationPage (дашборд, отфильтрованный по одной точке: KPI, график, heatmap, топ)
└── *                   NotFoundPage
```

### Redux
- `api/baseApi.ts` — `createApi` с `fetchBaseQuery({ baseUrl: '/api/v1' })`, теги
  `Product`, `Order`, `Location`, `Category`, `Analytics`. Эндпоинты разнесены по файлам через `injectEndpoints`:
  `analyticsApi.ts`, `ordersApi.ts`, `productsApi.ts`, `locationsApi.ts`, `categoriesApi.ts`.
  Мутации товаров инвалидируют `Product` и `Analytics`.
- `features/filters/filtersSlice.ts` — глобальные фильтры дашборда: `period: '7d' | '30d' | '90d'`,
  `locationId: number | null`, `live: boolean`. Селектор `selectDateRange` превращает период в `dateFrom/dateTo`.
- Данные с сервера — только через RTK Query, в слайсах — только состояние UI.

### Компоненты
- `layouts/`: `AppLayout`, `Sidebar` (навигация и блок «Точки сети» с часами работы), `PageHeader`.
- `components/ui/`: `Card`, `Button`, `SegmentedControl` (7/30/90 дней), `Select`, `Toggle`, `Badge`,
  `DeltaBadge` (↑ +9,4%), `Table`, `Pagination`, `Modal`, `Drawer`, `Skeleton`, `EmptyState`, `ErrorState`.
- `components/dashboard/`: `DashboardFilters`, `KpiCards`/`KpiCard`, `RevenueChart` (Recharts Area + Line пунктиром),
  `TopProductsList` (полосы цвета категории), `CategoryDonut` (Recharts Pie с суммой в центре), `LoadHeatmap`
  (своя CSS-сетка, в Recharts heatmap нет; подсказка по наведению «вторник, 15:00–16:00 · ≈ 16 заказов в час»),
  `LocationsCompareChart` (сгруппированные столбцы), `RecentOrdersPanel` (polling при Live).
- `components/orders/`: `OrdersFilters`, `OrdersTable`, `OrderStatusBadge`.
- `components/menu/`: `ProductsTable`, `ProductForm` (react-hook-form + `zodResolver`, схема в `schemas/product.ts`).
- `lib/format.ts`: `formatMoney` (`2 598 ₸`), `formatMoneyCompact` (`52,6 млн ₸`), `formatPct`, даты через `Intl` с локалью `ru-RU`.
- Tailwind: цвета макета в `tailwind.config.ts` (фон `cream`, тёмный сайдбар `espresso`, акцент `brand` — оранжевый, цвета категорий).

---

## 6. Этапы

0. **Инфраструктура**: docs/PLAN.md, CLAUDE.md, docker-compose.yml, init-скрипт тестовой БД, .gitignore, папки.
1. **Каркас бэкенда**: `uv init`, зависимости, config/db, `/health`, Alembic (async), модели и первая миграция.
2. **Сидирование**: `seed.py` с реалистичными профилями. Проверяем SQL-запросами, что пики и разница между будними и выходными на месте.
3. **CRUD API**: locations, categories, products, orders (список с фильтрами и пагинацией, детальная карточка) + тесты.
4. **Аналитика**: все `/analytics/*` + тесты на маленьком детерминированном наборе данных.
5. **Live**: `/orders/recent` + `simulate.py`.
6. **Каркас фронтенда**: Vite + TS, Tailwind и токены, роутер с layout, store, baseApi, ui-компоненты.
7. **Дашборд**: фильтры, KPI, графики, heatmap, сравнение точек, лента.
8. **Заказы**: таблица, фильтры в URL, пагинация, drawer.
9. **Меню**: CRUD с формой на RHF + zod.
10. **Точки**: список и страница точки.
11. **Полировка**: состояния загрузки, ошибок и пустых данных, README, проход по линтерам.
