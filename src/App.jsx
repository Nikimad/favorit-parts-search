import { useSelector } from 'react-redux'
import SearchForm from './components/SearchForm'
import BrandList from './components/BrandList'
import OffersTable from './components/OffersTable'

export default function App() {
  const brand = useSelector((state) => state.offers.brand)

  return (
    <main className="container py-4">
      <h1 className="h3 mb-4">Подбор автозапчастей</h1>
      <SearchForm />
      <section>
        <h2 className="h5 mb-3">1. Производители</h2>
        <BrandList />
      </section>
      <section className="mt-4">
        <h2 className="h5 mb-3">2. Предложения и аналоги</h2>
        <OffersTable key={brand} />
      </section>
    </main>
  )
}
