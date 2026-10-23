// Prod-аналог dev-прокси из vite.config.js: ключ добавляется на сервере и не попадает в браузер
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
