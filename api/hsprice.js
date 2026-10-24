// Prod-аналог dev-прокси из vite.config.js: ключ добавляется на сервере и не попадает в браузер
const ALLOWED = ['number', 'brand', 'analogues']
// Этап 2 занимает до ~9 с; должен быть меньше maxDuration в vercel.json
const TIMEOUT_MS = 12000

export default async function handler(req, res) {
  const params = new URLSearchParams()
  for (const k of ALLOWED) if (typeof req.query[k] === 'string') params.set(k, req.query[k])
  params.set('key', process.env.FAVORIT_API_KEY)
  try {
    const upstream = await fetch(`http://api.favorit-parts.ru/hs/hsprice/?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = await upstream.text()
    let body = null
    try {
      body = JSON.parse(text)
    } catch {}
    // API отдаёт ошибки в теле и с HTTP 200, такие ответы кэшировать нельзя
    const cacheable = upstream.ok && body && !body.error
    res.setHeader('Cache-Control', cacheable ? 's-maxage=300' : 'no-store')
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
  } catch (e) {
    // Ошибки в формате API: клиент переводит их в parseResponse
    res.setHeader('Cache-Control', 'no-store')
    if (e.name === 'TimeoutError') res.status(504).json({ error: 'Request timeout!' })
    else res.status(502).json({ error: 'Gateway error!' })
  }
}
