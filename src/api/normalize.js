const API_ERROR_MESSAGES = {
  'Request quota exceeded!': 'Превышен лимит запросов, попробуйте позже',
  'Empty key!': 'Ошибка конфигурации ключа API',
  'Invalid key client!': 'Ошибка конфигурации ключа API',
  'Invalid access key': 'Ошибка конфигурации ключа API',
}

// API на «ничего не найдено» возвращает один элемент-заглушку с нулевым goodsID и пустым brand
function isEmptyItem(item) {
  return !item.goodsID || item.goodsID === '0' || !item.brand
}

export function parseResponse(json) {
  if (json?.error) {
    const messages = [].concat(json.error).map((e) => API_ERROR_MESSAGES[e] ?? e)
    throw new Error([...new Set(messages)].join('. '))
  }
  return (json?.goods ?? []).filter((item) => !isEmptyItem(item))
}

// Корневой price не используем: он оставлен в API для совместимости, актуальная цена у складов
export function getPrice(item) {
  const prices = (item.warehouses ?? [])
    .filter((w) => Number(w.stock) > 0)
    .map((w) => Number(w.price))
  return prices.length ? Math.min(...prices) : null
}

export function extractBrands(goods) {
  const byBrand = new Map()
  for (const item of goods) {
    if (!byBrand.has(item.brand)) {
      byBrand.set(item.brand, { brand: item.brand, name: item.name, count: Number(item.count) || 0 })
    }
  }
  return [...byBrand.values()].sort((a, b) => a.brand.localeCompare(b.brand))
}

export function buildOffers(goods) {
  const byId = new Map()
  const add = (item, isOriginal) => {
    if (isEmptyItem(item) || byId.has(item.goodsID)) return
    byId.set(item.goodsID, {
      id: item.goodsID,
      brand: item.brand,
      number: item.number,
      name: item.name,
      count: Number(item.count) || 0,
      price: getPrice(item),
      isOriginal,
    })
  }
  for (const item of goods) {
    add(item, true)
    for (const analogue of item.analogues ?? []) add(analogue, false)
  }
  return [...byId.values()]
}
