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
├── README.md
├── docs/ (spec.md, plan.md, tasks.md)
├── .cursor/rules/project.mdc
├── api/hsprice.js          # ТОЛЬКО для опционального деплоя (T9)
└── src/
    ├── main.jsx            # Provider + Bootstrap CSS
    ├── App.jsx             # раскладка: форма, этап 1, этап 2
    ├── api/
    │   ├── favoritApi.js   # fetch + сетевые ошибки; вызывает normalize
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
        ├── Loader.jsx
        └── Notice.jsx      # props: variant ('danger' | 'info'), children
```

## 3. Доступ к API и ключ

Клиент всегда вызывает `/api/hsprice?...` без ключа.

- **Dev:** прокси Vite переписывает путь на `/hs/hsprice/` и подставляет `key` из `FAVORIT_API_KEY` (переменная без префикса `VITE_`, поэтому в бандл не попадает). Это же решает CORS и mixed content (API работает по `http://`).
- **Prod (опционально, T9):** serverless-функция `api/hsprice.js` делает то же самое.

```js
// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/hsprice': {
          target: 'http://api.favorit-parts.ru',
          changeOrigin: true,
          rewrite: (path) => {
            const params = new URLSearchParams(path.split('?')[1] ?? '')
            params.set('key', env.FAVORIT_API_KEY)
            return `/hs/hsprice/?${params}`
          },
        },
      },
    },
  }
})
```

## 4. API-слой

`normalize.js` (чистые функции, без `fetch`):

| Функция | Назначение |
|---|---|
| `parseResponse(json)` | Если есть `error` (строка или массив), бросает `Error` с человекочитаемым текстом (см. таблицу в spec, п. 5). Иначе возвращает `goods` без «пустых» элементов. Пустой элемент: нулевой `goodsID` или пустой `brand`. |
| `getPrice(item)` | Минимум `warehouses[].price` среди складов со `stock > 0`, иначе `null`. Корневой `price` игнорируется. |
| `extractBrands(goods)` | Уникальные бренды: `[{ brand, name, count }]` (первое вхождение), сортировка по алфавиту. Имя детали нужно, потому что один артикул у разных брендов может быть разными деталями. |
| `buildOffers(goods)` | Для каждого `g` в `goods`: `g` (с `isOriginal: true`) и все `g.analogues`. Дедупликация по `goodsID`. Элемент: `{ id, brand, number, name, count, price, isOriginal }`. |

`favoritApi.js`:

```js
export async function fetchGoods({ number, brand }) {
  const params = new URLSearchParams({ number })
  if (brand) { params.set('brand', brand); params.set('analogues', 'on') }
  let res
  try { res = await fetch(`/api/hsprice?${params}`) }
  catch { throw new Error(NETWORK_MESSAGE) }
  let json
  try { json = await res.json() } catch { throw new Error(NETWORK_MESSAGE) }
  if (!res.ok && !json?.error) throw new Error(NETWORK_MESSAGE)
  return parseResponse(json)   // может бросить с текстом ошибки API
}
```

## 5. Состояние (Redux)

```js
// search
{ query: '', brands: [], status: 'idle', error: null, requestId: null }
// offers
{ brand: null, items: [], status: 'idle', error: null, requestId: null }
// status: 'idle' | 'loading' | 'succeeded' | 'failed'
```

Thunks (`createAsyncThunk`):

- `fetchBrands(number)`: `fetchGoods({ number })` → `extractBrands`.
- `fetchOffers({ number, brand })`: `fetchGoods({ number, brand })` → `buildOffers`.

Правила редьюсеров:

- На `pending` сохраняем `meta.requestId`. На `fulfilled` / `rejected` результат применяем **только если** `meta.requestId` совпадает с сохранённым. Так устаревший ответ не затирает новый (AC-6).
- `offersSlice` на `fetchBrands.pending` сбрасывается в начальное состояние (FR-7).
- Ошибку сохраняем как `action.error.message`.
- «Пусто» получается автоматически: `status = 'succeeded'` и пустой массив → компонент показывает `Notice variant="info"`.

## 6. Компоненты

| Компонент | Что делает |
|---|---|
| `SearchForm` | Локальный `useState` для ввода. Enter и кнопка → `dispatch(fetchBrands(trimmed))`. Кнопка отключена при пустом вводе и при загрузке. |
| `BrandList` | Читает `search`. Состояния: Loader / Notice (danger или info) / `list-group` кликабельных брендов (бренд жирным, название детали приглушённо). Клик → `dispatch(fetchOffers({ number: query, brand }))`. |
| `OffersTable` | Читает `offers`. Те же состояния. Таблица Bootstrap (`table table-sm`, обёртка `table-responsive`): «Название / Производитель», «Цена», «Остаток». Нулевой остаток → класс `text-muted` и «Нет в наличии». |
| `Loader` | Bootstrap `spinner-border` с `role="status"`. |
| `Notice` | Bootstrap `alert alert-{variant}`. |

Форматирование цены: `toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.

## 7. Тесты

Только `normalize.test.js` (Vitest). Кейсы:

- пустая структура ответа → `[]`;
- `{error: 'Request quota exceeded!'}` и `{error: [..., ...]}` → ошибка с нужным текстом;
- несколько брендов, дубликаты бренда → уникальный отсортированный список;
- цена берётся из складов (корневой `price` намеренно «неправильный»), склады с `stock = 0` игнорируются, нет складов → `null`;
- `buildOffers`: искомая позиция и аналоги вместе, дедупликация, флаг `isOriginal`.

## 8. Компромиссы и допущения

- Нет автопоиска: экономим квоту API.
- Валюта не показывается: в документации не указана.
- Без роутинга и сортировки: не требуются заданием.
- Устаревшие ответы отбрасываются проверкой `requestId`. Отмену запросов через `signal` не делаем: для AC-6 она не нужна.
- Живые данные API могут отличаться от примеров документации (2019 г.).

## 9. Опциональный деплой

> ⚠️ **ОПЦИОНАЛЬНО. Не требуется заданием. Ни одна часть этого раздела не проверена на практике, фича нуждается в тестировании. Начинать только после T0–T8 и по прямой команде пользователя.**

**Идея:** гипотеза, что Cursor позволит быстро обкатать деплой на Vercel. Единый путь `/api/hsprice` в клиенте уже заложен, поэтому код приложения менять не нужно.

**Вариант A (рекомендуемый): serverless-функция.** Ключ остаётся на сервере. Набросок:

```js
// api/hsprice.js
const ALLOWED = ['number', 'brand', 'analogues']

export default async function handler(req, res) {
  const params = new URLSearchParams()
  for (const k of ALLOWED) if (typeof req.query[k] === 'string') params.set(k, req.query[k])
  params.set('key', process.env.FAVORIT_API_KEY)
  try {
    const upstream = await fetch(`http://api.favorit-parts.ru/hs/hsprice/?${params}`)
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(await upstream.text())
  } catch {
    res.status(502).end()   // без {"error"}, чтобы клиент показал сообщение о сбое из spec
  }
}
```

Переменная `FAVORIT_API_KEY` задаётся в настройках проекта Vercel.

**Вариант B: rewrite без функции** (`vercel.json`). Проще, но ключу пришлось бы попасть в клиент. Не рекомендуется.

**Чек-лист проверки (все пункты обязательны перед тем, как считать деплой рабочим):**

- [x] `/api/hsprice?number=7160500039S` на деплое возвращает JSON с `goods`.
- [x] `http://` API отвечает с серверов Vercel: нет таймаутов, блокировки по IP или региону. При необходимости задать регион функции в `vercel.json` (поле `regions`).
- [x] Ключ не найден ни в `dist/`, ни во вкладке Network.
- [x] Бренд со спецсимволами (например `NGK/NTK`) доходит до API без искажений.
- [x] Имитация сбоя upstream (502) → UI показывает сообщение о сбое, а не белый экран.
- [x] Учтено, что демо-ключ общий: квоту делят все, кто откроет ссылку. В README ссылка помечена как демо.

**Правило остановки:** если проверка не проходит за ~40 минут, откатываем деплой. В README остаётся описание как «не проверено», приложение сдаётся без деплоя.
