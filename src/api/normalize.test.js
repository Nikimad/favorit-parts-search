import { describe, expect, it } from 'vitest'
import { buildOffers, extractBrands, getPrice, parseResponse } from './normalize'

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
  it('объединяет искомую позицию и аналоги без дублей', () => {
    const goods = [
      item('1', 'MEYLE', {
        analogues: [item('2', 'BOSCH'), item('3', 'FEBI'), item('1', 'MEYLE')],
      }),
      item('2', 'BOSCH'),
    ]
    const offers = buildOffers(goods)
    expect(offers.map((o) => [o.id, o.isOriginal])).toEqual([
      ['1', true],
      ['2', false],
      ['3', false],
    ])
    expect(offers[0]).toEqual({
      id: '1',
      brand: 'MEYLE',
      number: '0189',
      name: 'Деталь MEYLE',
      count: 1,
      price: null,
      isOriginal: true,
    })
  })
})
