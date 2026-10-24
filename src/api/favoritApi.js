import { NETWORK_MESSAGE, parseResponse } from './normalize'

export async function fetchGoods({ number, brand }) {
  const params = new URLSearchParams({ number })
  if (brand) {
    params.set('brand', brand)
    params.set('analogues', 'on')
  }

  let res
  try {
    res = await fetch(`/api/hsprice?${params}`)
  } catch {
    throw new Error(NETWORK_MESSAGE)
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new Error(NETWORK_MESSAGE)
  }

  // Ошибка API может прийти и с HTTP 200, и с не-2xx: её текст важнее общего сообщения о сбое
  if (!res.ok && !json?.error) throw new Error(NETWORK_MESSAGE)
  return parseResponse(json)
}
