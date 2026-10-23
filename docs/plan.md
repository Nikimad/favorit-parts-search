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
    res.status(502).json({ error: 'Upstream unavailable' })
  }
}
```

Переменная `FAVORIT_API_KEY` задаётся в настройках проекта Vercel.

**Вариант B: rewrite без функции** (`vercel.json`). Проще, но ключу пришлось бы попасть в клиент. Не рекомендуется.

**Чек-лист проверки (все пункты обязательны перед тем, как считать деплой рабочим):**

- [ ] `/api/hsprice?number=7160500039S` на деплое возвращает JSON с `goods`.
- [ ] `http://` API отвечает с серверов Vercel: нет таймаутов, блокировки по IP или региону. При необходимости задать регион функции в `vercel.json` (поле `regions`).
- [ ] Ключ не найден ни в `dist/`, ни во вкладке Network.
- [ ] Бренд со спецсимволами (например `NGK/NTK`) доходит до API без искажений.
- [ ] Имитация сбоя upstream (502) → UI показывает сообщение о сбое, а не белый экран.
- [ ] Учтено, что демо-ключ общий: квоту делят все, кто откроет ссылку. В README ссылка помечена как демо.

**Правило остановки:** если проверка не проходит за ~40 минут, откатываем деплой. В README остаётся описание как «не проверено», приложение сдаётся без деплоя.

## 10. Расширения (T10–T14)

> Раздел переопределяет п. 4, 5, 6 и 9 там, где они противоречат. Требования: `docs/spec.md`, п. 9 (E-1…E-5). Новых файлов нет, кроме `vercel.json` в T14.

### E-1. Подпись загрузки и «Повторить» (T10)

- `Loader`: необязательный проп `label` (текст рядом со спиннером). На этапе 2: «Ищем аналоги, это может занять до 10 секунд».
- `Notice`: необязательный проп `onRetry`. Если передан, показывается кнопка «Повторить» (`btn btn-outline-secondary btn-sm`). Передаётся только для `variant="danger"`.
- `BrandList`: `onRetry={() => dispatch(fetchBrands(query))}`. `OffersTable`: `onRetry={() => dispatch(fetchOffers({ number: query, brand }))}`, где `query` берётся из слайса `search`.

### E-2. Блок искомой позиции, порядок, заголовок (T11)

- `buildOffers(goods)` возвращает `{ original, analogues }` (вместо плоского массива):
  - `original`: первая позиция верхнего уровня (с `isOriginal`) или `null`;
  - `analogues`: все `g.analogues`, без дубликатов по `id` и без `original`;
  - порядок: сначала `count > 0`, внутри группы по возрастанию цены, `null` в конце группы (стабильная сортировка).
- Состояние `offers`: `{ brand, original: null, analogues: [], status, error, requestId }`. Поле `items` убирается.
- «Пусто» на этапе 2: `original === null && analogues.length === 0`.
- `OffersTable`: блок искомой позиции сверху (Bootstrap `card`: название, бренд, артикул, цена, остаток; при `count = 0` приглушён с «Нет в наличии»), ниже заголовок «Аналоги: N, в наличии M» и таблица. Если `original = null`, блок не показывается. Отдельный файл под блок не заводить.
- `normalize.test.js`: обновить кейсы `buildOffers` и добавить проверки сортировки и `null`-цен.

### E-3. Свёртка позиций без наличия (T12)

- `OffersTable`: `const [showAll, setShowAll] = useState(false)`. По умолчанию в таблице только аналоги с `count > 0`.
- Под таблицей, если есть позиции без наличия (K > 0): кнопка «Показать ещё K без наличия» / «Скрыть позиции без наличия» (`btn btn-link`).
- Если аналогов в наличии нет, а K > 0: над кнопкой строка «Аналогов в наличии нет».
- Сброс при смене бренда: в `App.jsx` рендерить `<OffersTable key={brand} />`.

### E-4. Примеры на пустом экране (T13)

- В `SearchForm`, пока `search.status === 'idle'`: строка-подсказка («Введите артикул детали: покажем производителей, затем аналоги с ценой и остатком») и кнопки-примеры из константы `EXAMPLES = ['7160500039S', '0189']`.
- Клик: `setValue(example)` и `dispatch(fetchBrands(example))`. Поднимать состояние формы не нужно.

### E-5. Кэш и лимит времени функции (T14, только после T9)

Изменения в `api/hsprice.js` (заменяют блок `try/catch` из п. 9; тело ответа `{ error: 'Upstream unavailable' }` из п. 9 в UI показалось бы сырым английским текстом, поэтому ошибки шлюза приводятся к формату API и получают перевод в `parseResponse`):

```js
const TIMEOUT_MS = 12000   // стартовое значение, см. ниже

try {
  const upstream = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  const text = await upstream.text()
  let body = null
  try { body = JSON.parse(text) } catch {}
  const cacheable = upstream.ok && body && !body.error   // API отдаёт ошибки в теле
  res.setHeader('Cache-Control', cacheable ? 's-maxage=300' : 'no-store')
  res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
} catch (e) {
  res.setHeader('Cache-Control', 'no-store')
  if (e.name === 'TimeoutError') res.status(504).json({ error: 'Request timeout!' })
  else res.status(502).json({ error: 'Gateway error!' })
}
```

`vercel.json`:

```json
{ "functions": { "api/hsprice.js": { "maxDuration": 15 } } }
```

- Значения стартовые. Этап 2 занимал 4–9 с (NGK/NTK около 8,8 с), поэтому таймаут запроса к API не должен быть меньше ~12 с, а `maxDuration` должен быть больше таймаута. До установки значений сверить допустимый максимум для вашего тарифа Vercel по их документации. Если тариф не позволяет ≥ ~12 с, часть про таймаут не делаем и оставляем только заголовок `Cache-Control`.
- `parseResponse`: `'Request timeout!'` → «Сервис отвечает слишком долго. Повторите запрос»; `'Gateway error!'` → то же сообщение, что для сбоя сети. Добавить два кейса в `normalize.test.js`.
- Кнопка «Повторить» из E-1 покрывает оба случая.
