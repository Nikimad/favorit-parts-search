import SearchForm from './components/SearchForm'
import BrandList from './components/BrandList'

export default function App() {
  return (
    <main className="container py-4">
      <h1 className="h3 mb-4">Подбор автозапчастей</h1>
      <SearchForm />
      <section>
        <h2 className="h5 mb-3">1. Производители</h2>
        <BrandList />
      </section>
    </main>
  )
}
