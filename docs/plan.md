# План реализации

> Принцип: чем проще, тем лучше. Решения ниже выбраны ради минимума кода и зависимостей.

## 1. Стек

Vite + React (JS), Redux Toolkit + react-redux, Bootstrap 5 (только CSS), Vitest.

## 2. Структура проекта

```
.
├── .env.example            # FAVORIT_API_KEY=00000000-0000-0000-0000-000000000001
├── .gitignore              # включая .env
├── vite.config.js          # dev-прокси /api/hsprice
├── vercel.json             # maxDuration функции
├── api/hsprice.js          # prod-прокси: serverless-функция Vercel
├── README.md
├── docs/ (spec.md, plan.md, tasks.md)
├── .cursor/rules/ (project.mdc, simplicity.mdc)
└── src/
    ├── main.jsx            # Provider + Bootstrap CSS
    ├── App.jsx             # раскладка: форма, этап 1, этап 2
    ├── api/
    │   ├── favoritApi.js   # fetch + сетевые ошибки; вызывает parseResponse
    │   ├── normalize.js    # чистые функции, покрыты тестом
    │   └── normalize.test.js
    ├── store/
    │   ├── store.js
    │   ├── searchSlice.js  # этап 1
    │   └── offersSlice.js  # этап 2
    └── components/
        ├── SearchForm.jsx
        ├── BrandList.jsx
        ├── OffersTable.jsx
        ├── Loader.jsx      # props: label (необязательный)
        └── Notice.jsx      # props: variant ('danger' | 'info'), onRetry (необязательный), children
```

## 3. Доступ к API и ключ

Клиент всегда вызывает `/api/hsprice?...` без ключа. Прокси переписывает путь на `/hs/hsprice/` и добавляет `key` из `FAVORIT_API_KEY`. Это же решает CORS и mixed content (API работает по `http://`).

- **Dev (`vite.config.js`):** `server.proxy` с `rewrite`, ключ читается через `loadEnv(mode, cwd, '')`. Переменная без префикса `VITE_`, поэтому в бандл не попадает.
- **Prod (`api/hsprice.js`):** serverless-функция Vercel. Пропускает только `number`, `brand`, `analogues`, ключ берёт из переменной окружения проекта Vercel.
  - Запрос к API ограничен `AbortSignal.timeout(12000)`: этап 2 занимает 4–9 с (NGK/NTK около 8,8 с). Таймаут → `504 {"error":"Request timeout!"}`, прочий сбой → `502 {"error":"Gateway error!"}`. Ошибки отдаются в формате API, чтобы их перевёл `parseResponse`.
  - `Cache-Control: s-maxage=300` только для `upstream.ok` с валидным JSON без `error`, иначе `no-store`: API присылает ошибки и с HTTP 200.
- **`vercel.json`:** `maxDuration: 15` для функции, больше таймаута и в пределах лимита тарифа Hobby.

Rewrite в `vercel.json` без функции отвергнут: ключу пришлось бы попасть в клиент.

## 4. API-слой

`normalize.js` (чистые функции, без `fetch`):

| Экспорт | Назначение |
|---|---|
| `NETWORK_MESSAGE` | Текст сбоя сети, общий для `favoritApi.js` и перевода `Gateway error!`. |
| `parseResponse(json)` | Если есть `error` (строка или массив), бросает `Error` с переведённым текстом (таблица в spec, п. 5; неизвестные тексты как есть, повторы убираются). Иначе возвращает `goods` без «пустых» элементов. Пустой элемент: нулевой `goodsID` или пустой `brand`. |
| `getPrice(item)` | Минимум `warehouses[].price` среди складов со `stock > 0`, иначе `null`. Корневой `price` игнорируется. |
| `extractBrands(goods)` | Уникальные бренды `[{ brand, name, count }]` (первое вхождение), по алфавиту. Имя детали нужно, потому что один артикул у разных брендов может быть разными деталями. |
| `buildOffers(goods)` | `{ original, analogues }`. `original`: первая непустая позиция верхнего уровня или `null`. `analogues`: все `g.analogues` без пустых, без дублей по `goodsID` и без `original`; порядок по FR-9 (стабильная сортировка). Элемент: `{ id, brand, number, name, count, price }`. |

`favoritApi.js`: `fetchGoods({ number, brand })` собирает параметры через `URLSearchParams` (`brand` и `analogues=on` только для этапа 2) и вызывает `fetch`. Отказ `fetch`, невалидный JSON и не-2xx без `error` в теле → `Error(NETWORK_MESSAGE)`; иначе результат `parseResponse(json)`.

## 5. Состояние (Redux)

```js
// search
{ query: '', brands: [], status: 'idle', error: null, requestId: null }
// offers
{ brand: null, original: null, analogues: [], status: 'idle', error: null, requestId: null }
// status: 'idle' | 'loading' | 'succeeded' | 'failed'
```

Thunks (`createAsyncThunk`):

- `fetchBrands(number)`: `fetchGoods({ number })` → `extractBrands`.
- `fetchOffers({ number, brand })`: `fetchGoods({ number, brand })` → `buildOffers`.

Правила редьюсеров:

- На `pending` сохраняем `meta.requestId` и аргумент (`query` или `brand`). На `fulfilled` / `rejected` результат применяем **только если** `meta.requestId` совпадает с сохранённым. Так устаревший ответ не затирает новый (AC-6).
- `offersSlice` на `fetchBrands.pending` сбрасывается в начальное состояние (FR-7); обнулённый `requestId` заодно отбрасывает ответ этапа 2, который ещё в пути.
- Ошибку сохраняем как `action.error.message`.
- «Пусто» получается автоматически: `status = 'succeeded'` и пустые данные → компонент показывает `Notice variant="info"`.

## 6. Компоненты

| Компонент | Что делает |
|---|---|
| `SearchForm` | Локальный `useState` для ввода, `<form onSubmit>` → `dispatch(fetchBrands(trimmed))`. Кнопка отключена при пустом вводе и при загрузке. Всегда: подсказка и кнопки-примеры из `EXAMPLES = ['7160500039S', '0189']`; клик делает `setValue` и `dispatch(fetchBrands(example))`. |
| `BrandList` | Читает `search` и `offers.brand`. Состояния: подсказка `text-muted` при `idle` / Loader / Notice danger с `onRetry={() => dispatch(fetchBrands(query))}` / Notice info / `list-group` кнопок (бренд жирным, название детали приглушённо, выбранный `active`). Клик по невыбранному бренду → `dispatch(fetchOffers({ number: query, brand }))`. |
| `OffersTable` | Читает `offers` и `search.query`. Подсказка `text-muted` при `idle` / Loader с подписью этапа 2 / Notice danger с `onRetry` (повтор `fetchOffers`) / Notice info. Блок искомой позиции: `card` с бейджем «Искомая», приглушён при `count = 0`. Заголовок «Аналоги: N, в наличии M» и таблица (`table table-hover` в `table-responsive`). `useState(showAll)`: по умолчанию только `count > 0`, кнопка `btn btn-link` раскрывает остальные. Нулевой остаток → `text-muted` и «Нет в наличии». |
| `Loader` | Bootstrap `spinner-border` в обёртке с `role="status"`. Без `label` текст «Загрузка…» виден только скринридеру. |
| `Notice` | Bootstrap `alert alert-{variant}`; при `onRetry` кнопка «Повторить» (`btn btn-outline-secondary btn-sm`). |

`App.jsx` рендерит `<OffersTable key={brand} />` (бренд из `offers`): смена бренда пересоздаёт компонент и сворачивает список (FR-10).

Форматирование цены: `toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`, `null` → «—».

## 7. Тесты

Только `normalize.test.js` (Vitest). Кейсы:

- пустая структура ответа и заглушка «ничего не найдено» → `[]`;
- ошибка-строка, массив ошибок (без повторов), `Request timeout!`, `Gateway error!` → нужный текст;
- дубликаты бренда → уникальный отсортированный список, имя из первого вхождения;
- цена берётся из складов (корневой `price` намеренно «неправильный»), склады с `stock = 0` игнорируются, нет складов с остатком → `null`;
- `buildOffers`: отделение искомой позиции, дедупликация, порядок аналогов, пустой вход.

## 8. Компромиссы и допущения

- Нет автопоиска: экономим квоту API.
- Устаревшие ответы отбрасываются проверкой `requestId`. Отмену запросов через `signal` не делаем: для AC-6 она не нужна.
- Искомой считается только первая позиция верхнего уровня ответа этапа 2.
- Ответ этапа 2 приходит целиком (~1,4 МБ для `7160500039S` / MEYLE) и рендерится без пагинации; позиции без наличия свёрнуты.
- Без роутинга и пользовательской сортировки: не требуются заданием.
- Демо на Vercel работает на общем тестовом ключе: квоту делят все, кто открыл ссылку.
