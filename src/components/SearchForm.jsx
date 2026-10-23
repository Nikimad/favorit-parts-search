import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchBrands } from '../store/searchSlice'

export default function SearchForm() {
  const [value, setValue] = useState('')
  const loading = useSelector((state) => state.search.status === 'loading')
  const dispatch = useDispatch()
  const trimmed = value.trim()

  // shortcut: без debounce и автопоиска, запрос только по Enter или кнопке, чтобы не тратить квоту API
  const handleSubmit = (e) => {
    e.preventDefault()
    if (trimmed) dispatch(fetchBrands(trimmed))
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
        <button type="submit" className="btn btn-primary" disabled={!trimmed || loading}>
          Найти
        </button>
      </div>
    </form>
  )
}
