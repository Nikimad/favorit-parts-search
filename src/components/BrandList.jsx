import { useDispatch, useSelector } from "react-redux";
import { fetchOffers } from "../store/offersSlice";
import { fetchBrands } from "../store/searchSlice";
import Loader from "./Loader";
import Notice from "./Notice";

export default function BrandList() {
	const { query, brands, status, error } = useSelector((state) => state.search);
	const selected = useSelector((state) => state.offers.brand);
	const dispatch = useDispatch();

	if (status === "idle") {
		return (
			<p className="text-muted mb-0">
				Введите артикул или выберите пример выше
			</p>
		);
	}

	if (status === "loading") {
		return <Loader />;
	}

	if (status === "failed") {
		return (
			<Notice variant="danger" onRetry={() => dispatch(fetchBrands(query))}>
				{error}
			</Notice>
		);
	}

	if (!brands.length) {
		return (
			<Notice variant="info">По артикулу «{query}» ничего не найдено</Notice>
		);
	}

	const handleSelect = (brand) => {
		if (brand !== selected) {
			dispatch(fetchOffers({ number: query, brand }));
		}
	};

	return (
		<div className="list-group">
			{brands.map(({ brand, name }) => (
				<button
					key={brand}
					type="button"
					className={`list-group-item list-group-item-action${brand === selected ? " active" : ""}`}
					aria-current={brand === selected}
					onClick={() => handleSelect(brand)}
				>
					<span className="fw-bold">{brand}</span>
					<small className="opacity-75 ms-2">{name}</small>
				</button>
			))}
		</div>
	);
}
