import { useSelector } from "react-redux";
import BrandList from "./components/BrandList";
import OffersTable from "./components/OffersTable";
import SearchForm from "./components/SearchForm";

export default function App() {
	const brand = useSelector((state) => state.offers.brand);

	return (
		<main>
			<section className="bg-dark">
				<div className="container-fluid container-xxl py-5 px-3 px-md-5">
					<div className="row">
						<div className="col-md-10 col-lg-12 mx-auto text-white">
							<h1 className="display-3 mb-0">Подбор автозапчастей</h1>
							<p className="lead">
								Введите артикул: покажем производителей, аналоги, цены и
								остатки.
							</p>
							<SearchForm />
						</div>
					</div>
				</div>
			</section>

			<section className="container-fluid container-xxl py-5 px-3 px-md-5">
				<div className="row gy-4">
					<section className="col-md-10 col-lg-4 mx-auto">
						<h2 className="h4 pb-2 mb-3 border-bottom border-2 border-dark">
							Производители
						</h2>
						<BrandList />
					</section>

					<section className="col-md-10 col-lg-8 mx-auto">
						<h2 className="h4 pb-2 mb-3 border-bottom border-2 border-dark">
							Предложения и аналоги
						</h2>
						<OffersTable key={brand} />
					</section>
				</div>
			</section>
		</main>
	);
}
