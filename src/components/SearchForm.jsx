import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands } from '../store/searchSlice'

const EXAMPLES = ['7160500039S', '0189']

export default function SearchForm() {
  const [value, setValue] = useState('')
  const status = useSelector((state) => state.search.status)
  const dispatch = useDispatch()
  const trimmed = value.trim()

  // shortcut: без debounce и автопоиска, запрос только по Enter или кнопке, чтобы не тратить квоту API
  const handleSubmit = (e) => {
    e.preventDefault()
    if (trimmed) dispatch(fetchBrands(trimmed))
  }

  const handleExample = (example) => {
    setValue(example)
    dispatch(fetchBrands(example))
  }

  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <label htmlFor="article" className="form-label">
        Артикул
      </label>
      <div className="input-group">
        <input
          id="article"
          className="form-control"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Например, 7160500039S"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary" disabled={!trimmed || status === 'loading'}>
          Найти
        </button>
      </div>
      {status === 'idle' && (
        <div className="form-text">
          Введите артикул детали: покажем производителей, затем аналоги с ценой и остатком. Например:{' '}
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="btn btn-link btn-sm p-0 me-2 align-baseline"
              onClick={() => handleExample(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
