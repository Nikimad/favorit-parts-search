import { useDispatch, useSelector } from 'react-redux'
import { fetchOffers } from '../store/offersSlice'
import Loader from './Loader'
import Notice from './Notice'

const formatPrice = (price) =>
  price === null ? '—' : price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function OffersTable() {
  const { brand, items, status, error } = useSelector((state) => state.offers)
  const query = useSelector((state) => state.search.query)
  const dispatch = useDispatch()

  if (status === 'idle') return null
  if (status === 'loading') return <Loader label="Ищем аналоги, это может занять до 10 секунд" />
  if (status === 'failed')
    return (
      <Notice variant="danger" onRetry={() => dispatch(fetchOffers({ number: query, brand }))}>
        {error}
      </Notice>
    )
  if (!items.length) return <Notice variant="info">Для выбранного производителя предложений не найдено</Notice>

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Название / Производитель</th>
            <th className="text-end">Цена</th>
            <th className="text-end">Остаток</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ id, brand, number, name, count, price, isOriginal }) => {
            const muted = count ? '' : 'text-muted'
            return (
              <tr key={id}>
                <td className={muted}>
                  <div>
                    {name} <span className="fw-bold">{brand}</span>
                    {isOriginal && <span className="badge text-bg-primary ms-2">Искомая</span>}
                  </div>
                  <small className="text-muted">{number}</small>
                </td>
                <td className={`text-end ${muted}`}>{formatPrice(price)}</td>
                <td className={`text-end ${muted}`}>{count || 'Нет в наличии'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
