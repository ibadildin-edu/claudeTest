# CoffeeMetrics

Аналитический дашборд для сети из трёх кофеен. Учебный full-stack проект.

- План, схема БД, эндпоинты и этапы: [docs/PLAN.md](docs/PLAN.md). Сверяйся с ним перед каждым этапом и обновляй, если решение меняется.
- Ориентир по UI: [design/dashboard.png](design/dashboard.png).

## Стек

- **БД**: PostgreSQL 16 в Docker (`docker compose`). Локально Postgres не ставим.
- **Бэкенд** (`backend/`): Python 3.12, FastAPI, SQLAlchemy 2.0 (async) + asyncpg, Alembic, Pydantic v2 + pydantic-settings, uv.
  Тесты: pytest + pytest-asyncio + httpx. Линтеры: ruff, mypy.
- **Фронтенд** (`frontend/`): Vite + React + TypeScript, Redux Toolkit + RTK Query, React Router (вложенные маршруты,
  общий layout с `<Outlet/>`), Recharts, react-hook-form + zod, Tailwind CSS. Тесты: Vitest + Testing Library. Пакетный менеджер — npm.

## Команды

Окружение — Windows. Команды ниже работают и в PowerShell, и в Git Bash.

### БД (из корня)
```
docker compose up -d          # запустить Postgres (localhost:5432, coffee/coffee, БД coffeemetrics)
docker compose ps             # статус, ждём healthy
docker compose logs -f db
docker compose down           # остановить (данные остаются в volume pgdata)
docker compose down -v        # остановить и удалить данные
```
Тестовая БД `coffeemetrics_test` создаётся скриптом `docker/postgres/init/` только при первом старте с пустым volume.

### Бэкенд (из `backend/`)
```
uv sync
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
uv run python -m app.scripts.seed --reset          # 180 дней данных
uv run python -m app.scripts.simulate              # Live: новые заказы в реальном времени
uv run uvicorn app.main:app --reload               # http://localhost:8000, docs: /docs
uv run pytest
uv run ruff check .
uv run ruff format .
uv run mypy app
```

### Фронтенд (из `frontend/`)
```
npm install
npm run dev        # http://localhost:5173, /api проксируется на :8000
npm run build
npm run test
npm run lint
```

## Соглашения

### Общие
- Все API-пути под префиксом `/api/v1`. JSON в camelCase, в Python-коде snake_case.
- Деньги — целые тенге (`int`, ₸), без float и копеек.
- Время храним в UTC (`timestamptz`). Дни, часы и дни недели для аналитики считаем в `APP_TIMEZONE` (`Asia/Almaty`).
- Отменённые заказы (`cancelled`) в аналитике не учитываем.
- Тексты интерфейса — на русском. Код, имена и коммиты — на английском.
- Коммиты — Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- `.env` не коммитим, держим актуальный `.env.example`.

### Бэкенд
- Только async: `AsyncSession`, async-эндпоинты. Синхронный драйвер не используем.
- SQLAlchemy 2.0 в стиле `Mapped[...]` / `mapped_column`. Запросы через `select()`, без legacy `Query`.
- Слои: `api/v1/` — тонкие роутеры (валидация, DI, коды ответов); `services/` — бизнес-логика и SQL;
  `schemas/` — Pydantic; `models/` — ORM. Роутеры не пишут SQL.
- Pydantic v2: базовая схема с `from_attributes=True`, `alias_generator=to_camel`, `populate_by_name=True`.
- Агрегации для графиков считаем в SQL (`GROUP BY`, `date_trunc`, `extract` по `created_at AT TIME ZONE :tz`), не в циклах Python.
- Схема БД меняется только через миграции Alembic. Автогенерацию проверяем руками, уже применённые миграции не правим.
- Товары удаляем мягко (`is_active = false`). В `order_items` храним снимок цены `unit_price`.
- Type hints везде. `ruff check`, `ruff format` и `mypy` проходят без ошибок.
- Тесты бьют в отдельную БД `coffeemetrics_test`, никогда в основную.

### Фронтенд
- Строгий TypeScript (`strict: true`), без `any`.
- Только функциональные компоненты, именованные экспорты. Один компонент — один файл, PascalCase.
- Данные с сервера получаем только через RTK Query (`api/baseApi.ts` + `injectEndpoints`), без `fetch`/axios в компонентах.
  Мутации инвалидируют теги (`Product`, `Order`, `Location`, `Category`, `Analytics`).
- Redux-слайсы хранят только UI-состояние, например глобальные фильтры в `features/filters/filtersSlice.ts`.
  Серверные данные в слайсы не копируем.
- Фильтры страницы «Заказы» живут в URL search params.
- Формы — react-hook-form + zod (`zodResolver`), схемы в `src/schemas/`.
- Стили — Tailwind и токены из `tailwind.config.ts` (`cream`, `espresso`, `brand`, цвета категорий). Без инлайн-цветов и hex в JSX.
- Форматирование чисел, денег и дат — только через `src/lib/format.ts` (локаль `ru-RU`, `52,6 млн ₸`).
- У каждого блока с данными есть состояния загрузки (skeleton), ошибки и пустых данных.
