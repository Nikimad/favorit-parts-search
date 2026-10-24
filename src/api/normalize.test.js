import { describe, expect, it } from 'vitest'
import { NETWORK_MESSAGE, buildOffers, extractBrands, getPrice, parseResponse } from './normalize'

const item = (goodsID, brand, extra = {}) => ({
  goodsID,
  brand,
  number: '0189',
  name: `Деталь ${brand}`,
  count: 1,
  warehouses: [],
  ...extra,
})

describe('parseResponse', () => {
  it('возвращает [] для пустой структуры и заглушки «ничего не найдено»', () => {
    expect(parseResponse({})).toEqual([])
    expect(parseResponse({ goods: [] })).toEqual([])
    expect(parseResponse({ goods: [item('0', '')] })).toEqual([])
  })

  it('переводит ошибку-строку', () => {
    expect(() => parseResponse({ error: 'Request quota exceeded!' })).toThrow(
      'Превышен лимит запросов, попробуйте позже',
    )
  })

  it('переводит массив ошибок без повторов', () => {
    expect(() => parseResponse({ error: ['Empty key!', 'Invalid key client!'] })).toThrow(
      /^Ошибка конфигурации ключа API$/,
    )
  })

  it('переводит таймаут функции', () => {
    expect(() => parseResponse({ error: 'Request timeout!' })).toThrow(
      'Сервис отвечает слишком долго. Повторите запрос',
    )
  })

  it('переводит ошибку шлюза в сообщение о сбое сети', () => {
    expect(() => parseResponse({ error: 'Gateway error!' })).toThrow(NETWORK_MESSAGE)
  })
})

describe('extractBrands', () => {
  it('возвращает уникальные бренды по алфавиту, имя из первого вхождения', () => {
    const goods = [
      item('1', 'MEYLE', { name: 'Первая' }),
      item('2', 'BOSCH'),
      item('3', 'MEYLE', { name: 'Вторая' }),
    ]
    expect(extractBrands(goods)).toEqual([
      { brand: 'BOSCH', name: 'Деталь BOSCH', count: 1 },
      { brand: 'MEYLE', name: 'Первая', count: 1 },
    ])
  })
})

describe('getPrice', () => {
  it('берёт минимум по складам с остатком и игнорирует корневой price', () => {
    const goods = item('1', 'MEYLE', {
      price: 1,
      warehouses: [
        { price: 500, stock: 2 },
        { price: 100, stock: 0 },
        { price: 300, stock: 5 },
      ],
    })
    expect(getPrice(goods)).toBe(300)
  })

  it('возвращает null, если складов с остатком нет', () => {
    expect(getPrice(item('1', 'MEYLE'))).toBeNull()
    expect(getPrice(item('1', 'MEYLE', { warehouses: [{ price: 100, stock: 0 }] }))).toBeNull()
  })
})

describe('buildOffers', () => {
  const stock = (price) => ({ warehouses: [{ price, stock: 1 }] })

  it('отделяет искомую позицию от аналогов и убирает дубли', () => {
    const goods = [
      item('1', 'MEYLE', {
        analogues: [item('2', 'BOSCH'), item('3', 'FEBI'), item('1', 'MEYLE'), item('2', 'BOSCH')],
      }),
    ]
    const { original, analogues } = buildOffers(goods)
    expect(original).toEqual({
      id: '1',
      brand: 'MEYLE',
      number: '0189',
      name: 'Деталь MEYLE',
      count: 1,
      price: null,
    })
    expect(analogues.map((o) => o.id)).toEqual(['2', '3'])
  })

  it('сортирует: сначала в наличии, по возрастанию цены, без цены в конце группы', () => {
    const goods = [
      item('1', 'MEYLE', {
        analogues: [
          item('a', 'A', { count: 0 }),
          item('b', 'B', stock(300)),
          item('c', 'C'),
          item('d', 'D', stock(100)),
          item('e', 'E', { count: 0, ...stock(50) }),
        ],
      }),
    ]
    expect(buildOffers(goods).analogues.map((o) => o.id)).toEqual(['d', 'b', 'c', 'e', 'a'])
  })

  it('возвращает пустой результат без позиций', () => {
    expect(buildOffers([])).toEqual({ original: null, analogues: [] })
  })
})
