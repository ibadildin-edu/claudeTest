# CoffeeMetrics — план проекта

Учебный full-stack проект: аналитический дашборд для сети из трёх кофеен (Центр, Университет, Набережная).
Прототип интерфейса — [`design/dashboard.png`](../design/dashboard.png).

**Стек.** PostgreSQL 16 (Docker) · Python 3.12, FastAPI, SQLAlchemy 2.0 async + asyncpg, Alembic, Pydantic v2, uv ·
Vite + React + TypeScript, Redux Toolkit + RTK Query, React Router, Recharts, react-hook-form + zod, Tailwind CSS.

## Принятые решения

- **Live** — это фоновый симулятор заказов в процессе API, а не флаг интерфейса. Переключатель Live в шапке
  вызывает `POST /simulator/start` и `/simulator/stop`. Пока симулятор работает, данные дашборда опрашиваются через
  RTK Query `pollingInterval` раз в 5 с, а новые заказы плавно появляются в ленте «Последние заказы».
  Лента собирается из `/orders?sort=-createdAt&pageSize=9` и `/analytics/kpi` за сегодня (`RecentOrdersPanel`),
  отдельный `/orders/recent` не понадобился.
- **Авторизации нет**: все эндпоинты открыты.
- **Тесты**: pytest + httpx на бэкенде (отдельная тестовая БД `coffeemetrics_test`), Vitest + Testing Library на фронтенде.
- **Сравнение точек** — отдельная карточка на дашборде под тепловой картой.
- Валюта — тенге (₸), суммы храним **целыми числами** (`INTEGER`/`BIGINT`), без копеек.
- Время храним в UTC (`timestamptz`). Аналитику (дни, часы, дни недели) считаем в зоне `Asia/Almaty` (настройка `APP_TIMEZONE`).
- **Сидим 90 дней, ~10 тыс. заказов** (`--days` настраивается). Последний день — сегодня до текущего часа.
  Для периода «90 дней» предыдущего периода в данных нет (дельты `null`); для полного сравнения — `seed --days 180`.
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
│   │   ├── services/          # бизнес-логика и SQL-агрегации; simulator.py + demand.py — Live-симулятор
│   │   ├── api/v1/            # роутеры: locations, categories, products, orders, analytics, simulator; deps.py
│   │   └── scripts/           # seed.py
│   └── tests/
└── frontend/
    ├── package.json, vite.config.ts, tailwind.config.ts, tsconfig*.json   (шаг «фронтенд»)
    └── src/
        ├── app/               # store.ts, hooks.ts, router.tsx, routeHandle.ts
        ├── api/               # baseApi.ts + endpoints (injectEndpoints)
        ├── features/filters/  # filtersSlice.ts
        ├── features/live/     # LiveToggle.tsx, useLive.ts (статус симулятора, опрос раз в 5 с)
        ├── layouts/           # AppLayout.tsx (Sidebar + PageHeader + <Outlet/>)
        ├── pages/             # страницы-маршруты
        ├── components/        # ui/, charts/, dashboard/, orders/, menu/, locations/
        ├── lib/               # format.ts, dates.ts
        ├── schemas/           # zod-схемы форм и URL-фильтров
        ├── theme/             # palette.ts — токены цветов для Tailwind и Recharts
        └── test/              # setup.ts, mockApi.ts
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
Без дат — последние 30 дней до сегодня; период не длиннее 366 дней. Проценты и дельты округлены до 0,1; дельта `null`, если в прошлом периоде 0.

### Справочники и CRUD
| метод | путь | описание |
|---|---|---|
| GET | `/health` | проверка API и БД |
| GET | `/locations` | список точек |
| GET | `/locations/{id}` | карточка точки |
| POST | `/locations` | создание (имя и slug уникальны, `opensAt < closesAt`) |
| PATCH | `/locations/{id}` | частичное обновление |
| DELETE | `/locations/{id}` | удаление, 204; 409, если у точки есть заказы |
| GET | `/categories` | категории с цветами |
| GET | `/products` | `?categoryId&search&includeInactive` |
| GET | `/products/{id}` | |
| POST | `/products` | создание (валидация: цена > 0, имя уникально) |
| PATCH | `/products/{id}` | частичное обновление |
| DELETE | `/products/{id}` | мягкое удаление (`is_active=false`), 204 |

### Заказы
| метод | путь | описание |
|---|---|---|
| GET | `/orders` | таблица: `?locationId&status&dateFrom&dateTo&productId&categoryId&minTotal&maxTotal&page&pageSize&sort` → `{items, total, page, pageSize}`. `sort`: `±createdAt`, `±totalAmount`, `±id` (по умолчанию `-createdAt`), `pageSize` ≤ 100. В `items` есть `itemsSummary` («Капучино ×2, Круассан») |
| GET | `/orders/{id}` | заказ с позициями |

### Симулятор (Live)
| метод | путь | описание |
|---|---|---|
| GET | `/simulator/status` | `{running, startedAt, ordersCreated, lastOrderAt, idleReason}`; `idleReason` — почему работающий симулятор сейчас не создаёт заказы: `closed`, `no_locations`, `no_products`, `error` |
| POST | `/simulator/start` | запуск, ответ — статус. Повторный запуск ничего не меняет |
| POST | `/simulator/stop` | остановка, ответ — статус. Заказы «Готовится» сразу получают итоговый статус |

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

`uv run python -m app.scripts.seed [--days 90] [--seed 42] [--reset]`
- Справочники: 3 точки, 4 категории, ~20–25 позиций (кофе, чай, выпечка, десерты) с ценами 900–2500 ₸.
- Профиль точек:
  - **Центр** — офисы: сильный утренний пик 8–9, обед 12–14, в выходные на ~40% меньше заказов, средний чек выше среднего.
  - **Университет** — студенты: пики 8–10 и 12–14, низкий чек, в выходные заказов мало.
  - **Набережная** — прогулочная: в будни умеренно, в выходные пик 11–18 в 1,5–2 раза выше, высокий чек (десерты).
- Число заказов в час — Пуассон от функции: базовое число заказов точки × почасовой профиль (смесь гауссиан) × день недели × тренд (+~10% за период) × шум.
  Масштаб — ~10 тыс. заказов за 90 дней (≈110 в день на сеть), в самый загруженный час точки ~5–9 заказов.
- Корзина: 1–4 позиции. Веса категорий зависят от часа (утром кофе + выпечка, днём больше десертов и чая).
- Статусы: исторические заказы — `completed`, ~1–2% — `cancelled`.
- Вставка через asyncpg `copy_records_to_table`: ~10 тыс. заказов и ~17 тыс. позиций за пару секунд. RNG с фиксированным seed, данные воспроизводимы.

**Симулятор** (`services/simulator.py`, `OrderSimulator`) — asyncio-задача в процессе API. Создаётся в lifespan
приложения, на остановке сервера останавливается. Состояние живёт в памяти процесса, поэтому API запускаем одним воркером.
- Каждые 2–3 с создаёт заказ со статусом `preparing`. Через 6–15 с заказ переходит в `completed` (~1,5% — в `cancelled`).
- Учитывает текущее время (`services/demand.py`): заказы получают только открытые сейчас точки. Точку, размер корзины
  и позиции выбирает по истории за 4 недели для того же часа и типа дня (будни/выходные). Считается SQL-агрегацией:
  заказы точки, распределение `items_count`, проданное количество каждой позиции. Цена — текущая цена активной позиции.
  Новые позиции и точки без истории получают небольшой вес (сглаживание +1). Сегодняшние заказы в модель не входят,
  чтобы симулятор не учился на себе. Модель кэшируется на час, меню и часы работы перечитываются на каждом заказе.
- Если открытых точек или активных позиций нет, симулятор работает вхолостую и отдаёт причину в `idleReason`.
- `stop()` мягкий: текущий заказ дописывается и учитывается, затем все заказы «Готовится» получают итоговый статус.
  `start()` заодно закрывает «Готовится», оставшиеся после аварийного завершения процесса.
- Live даёт ~1200–1800 заказов в час, так что сегодняшние показатели быстро растут.
  Вернуть исходные данные: `seed --reset`.

---

## 5. Фронтенд

### Маршруты (React Router 8, data router, общий layout)
```
/                       AppLayout (Sidebar + PageHeader + <Outlet/>)
├── index               DashboardPage
├── orders              OrdersPage (фильтры и страница — в URL search params)
│   └── :orderId        OrderDrawer (вложенный маршрут, боковая панель поверх таблицы)
├── menu                MenuPage
│   ├── new             ProductFormModal
│   └── :productId/edit ProductFormModal
├── locations           LocationsPage
│   └── :locationId     LocationPage (дашборд, отфильтрованный по одной точке: KPI, график, heatmap, топ, доли)
└── *                   NotFoundPage
```
- Страницы подключены через `lazy` маршрута: Recharts грузится только для страниц с графиками.
- Шапка (`PageHeader`) берёт заголовок и набор глобальных фильтров из `handle` самого глубокого маршрута
  (`app/routeHandle.ts`); заголовок страницы точки — компонент `LocationTitle`.
- Ошибки рендера ловит `errorElement` (`RouteErrorPage`) внутри layout.

### Redux
- `api/baseApi.ts` — `createApi` с `fetchBaseQuery({ baseUrl: '/api/v1' })`, теги
  `Product`, `Order`, `Location`, `Category`, `Analytics`. Эндпоинты разнесены по файлам через `injectEndpoints`:
  `analyticsApi.ts`, `ordersApi.ts`, `productsApi.ts`, `locationsApi.ts`, `categoriesApi.ts`.
  Мутации товаров инвалидируют `Product` и `Analytics`; изменение товара — ещё и `Order` (в составе заказа имя товара).
  `simulatorApi.ts`: запрос статуса и одна мутация `setSimulatorRunning` (start/stop). Ответ мутации сразу кладётся
  в кэш статуса, а сама мутация инвалидирует `Order` и `Analytics`: при старте и остановке у заказов «Готовится» меняется статус.
- Типы ответов генерируются из `openapi.json`: `npm run gen:api` → `api/schema.ts` (openapi-typescript, коммитим),
  читаемые алиасы — в `api/types.ts`.
- `features/filters/filtersSlice.ts` — глобальные фильтры шапки: `period: '7d' | '30d' | '90d'` (по умолчанию `30d`),
  `locationId: number | null`. Мемоизированные селекторы `selectDateRange` (период → `dateFrom/dateTo`
  в зоне Алматы) и `selectAnalyticsParams` отдают стабильный объект, чтобы карточки в `memo` не перерисовывались зря.
- Данные с сервера — только через RTK Query, в слайсах — только состояние UI. Поэтому Live берётся из статуса симулятора:
  `features/live/useLive.ts` опрашивает `/simulator/status` раз в 5 с (так Live, включённый в другой вкладке, виден везде).
  `useLivePolling()` отдаёт карточкам `pollingInterval: 5000`, пока симулятор работает. Карточки затемняются только
  при смене фильтра (`isFetching && !currentData`), фоновый опрос их не мигает.

### Компоненты
- `layouts/`: `AppLayout`, `Sidebar` + `SidebarLocations` (блок «Точки сети» с часами работы), `PageHeader`.
- `features/filters/`: `PeriodFilter`, `LocationFilter`, `FiltersSummary` (подзаголовок с датами и точкой).
- `features/live/`: `LiveToggle` — переключатель в шапке, запускает и останавливает симулятор.
- `components/ui/`: `Card`, `CardHeader`, `Button`, `SegmentedControl` (7/30/90 дней), `Select`, `Input`, `Field`, `Toggle`,
  `Badge`, `DeltaBadge` (↑ +9,4%), `ColorDot`, `Table`, `Pagination`, `Modal`, `Drawer`, `Skeleton`, `EmptyState`, `ErrorState`.
- `components/dashboard/` (карточки графиков — в `React.memo`, подготовка данных — `useMemo`, обработчики — `useCallback`):
  `KpiCards`/`KpiCard`, `RevenueChart` (Recharts Area + Line пунктиром), `TopProductsChart` (горизонтальные Bar цвета категории),
  `CategoryDonut` (Recharts Pie с суммой в центре), `LoadHeatmap` + `HeatmapGrid` (своя CSS-сетка, в Recharts heatmap нет;
  подсказка «вторник, 15:00–16:00 · ≈ 16 заказов в час», без наведения — пиковый час), `LocationsCompareChart`
  (сгруппированные столбцы: выручка и заказы на двух осях), `RecentOrdersPanel` + `RecentOrdersList` (Live-лента).
  Анимация ленты — `lib/useFeedTransitions.ts`: новые заказы раскрываются сверху (`grid-template-rows: 0fr → 1fr`),
  ушедшие снизу сворачиваются одновременно, поэтому высота ленты не прыгает. Пока идёт Live, у `TopProductsChart`
  выключена анимация столбцов: Recharts прячет подписи на время анимации, и числа мигали бы раз в 5 с.
  Цвета из данных Recharts 3 получает через проп `shape` (`Cell` устарел).
- `components/orders/`: `OrdersFilters`, `OrdersTable`, `SortableHeader`, `OrderStatusBadge`, `OrderDrawer`.
  URL-параметры разбирает zod-схема `schemas/ordersSearch.ts` (мусор → «без фильтра», а не 422).
- `components/menu/`: `ProductsTable`, `ProductForm` (react-hook-form + `zodResolver`, схема в `schemas/product.ts`,
  ошибки 409/422 с сервера попадают в поля формы), `ProductFormModal`, `HideProductDialog`.
- `components/locations/`: `LocationCard`, `OpenStatus`, `LocationTitle`.
- `lib/format.ts`: `formatMoney` (`2 598 ₸`), `formatMoneyCompact` (`52,6 млн ₸`), `formatPct`, `formatDelta`, `pluralize`,
  даты через `Intl` с локалью `ru-RU`; `lib/dates.ts` — календарные даты в `Asia/Almaty`.
- Tailwind 4 + `tailwind.config.ts` (через `@config`): токены в `theme/palette.ts` (фон `cream`, тёмный сайдбар `espresso`,
  акцент `brand`, цвета категорий, шкала `heat`). Recharts берёт те же токены из `palette.ts`.
- Линтер — oxlint (шаблон Vite): `rules-of-hooks`, `exhaustive-deps`, `no-explicit-any`.
- Тесты (Vitest + Testing Library): форматирование, даты, слайс фильтров, zod-схемы, форма позиции, тепловая карта,
  маршруты (404 внутри layout, drawer заказа как вложенный маршрут) на подменённом `fetch` (`test/mockApi.ts`).

---

## 6. Этапы

0. **Инфраструктура**: docs/PLAN.md, CLAUDE.md, docker-compose.yml, init-скрипт тестовой БД, .gitignore, папки.
1. **Каркас бэкенда**: `uv init`, зависимости, config/db, `/health`, Alembic (async), модели и первая миграция.
2. **Сидирование**: `seed.py` с реалистичными профилями. Проверяем SQL-запросами, что пики и разница между будними и выходными на месте.
3. **CRUD API**: locations, categories, products, orders (список с фильтрами и пагинацией, детальная карточка) + тесты.
4. **Аналитика**: все `/analytics/*` + тесты на маленьком детерминированном наборе данных.
5. **Live**: симулятор заказов в процессе API (`/simulator/start|stop|status`) + тесты.
6. **Каркас фронтенда**: Vite + TS, Tailwind и токены, роутер с layout, store, baseApi, ui-компоненты.
7. **Дашборд**: фильтры, KPI, графики, heatmap, сравнение точек, лента.
8. **Заказы**: таблица, фильтры в URL, пагинация, drawer.
9. **Меню**: CRUD с формой на RHF + zod.
10. **Точки**: список и страница точки.
11. **Полировка**: состояния загрузки, ошибок и пустых данных, README, проход по линтерам.
