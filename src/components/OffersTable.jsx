import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOffers } from "../store/offersSlice";
import Loader from "./Loader";
import Notice from "./Notice";

const formatPrice = (price) =>
	price === null
		? "—"
		: price.toLocaleString("ru-RU", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			});

export default function OffersTable() {
	const { brand, original, analogues, status, error } = useSelector(
		(state) => state.offers,
	);
	const query = useSelector((state) => state.search.query);
	const dispatch = useDispatch();
	const [showAll, setShowAll] = useState(false);

	if (status === "idle") {
		return (
			<p className="text-muted mb-0">
				Выберите производителя, чтобы увидеть предложения и аналоги
			</p>
		);
	}

	if (status === "loading") {
		return <Loader label="Ищем аналоги, это может занять до 10 секунд" />;
	}

	if (status === "failed") {
		return (
			<Notice
				variant="danger"
				onRetry={() => dispatch(fetchOffers({ number: query, brand }))}
			>
				{error}
			</Notice>
		);
	}

	if (!original && !analogues.length) {
		return (
			<Notice variant="info">
				Для выбранного производителя предложений не найдено
			</Notice>
		);
	}

	const inStock = analogues.filter((a) => a.count > 0).length;
	const outOfStock = analogues.length - inStock;
	const visible = showAll ? analogues : analogues.filter((a) => a.count > 0);

	return (
		<>
			{original && (
				<div className={`card mb-4 ${original.count ? "" : "text-muted"}`}>
					<div className="card-body">
						<span className="badge text-bg-primary mb-2">Искомая</span>
						<div>
							{original.name} <span className="fw-bold">{original.brand}</span>
						</div>
						<small className="text-muted">{original.number}</small>
						<div className="mt-2">
							Цена: {formatPrice(original.price)} · Остаток:{" "}
							{original.count || "Нет в наличии"}
						</div>
					</div>
				</div>
			)}

			<h3 className="h6 mb-2">
				Аналоги: {analogues.length}, в наличии {inStock}
			</h3>

			{visible.length > 0 && (
				<div className="table-responsive">
					<table className="table table-hover align-middle">
						<thead className="table-light">
							<tr>
								<th>Название / Производитель</th>
								<th className="text-end">Цена</th>
								<th className="text-end">Остаток</th>
							</tr>
						</thead>
						<tbody>
							{visible.map(({ id, brand, number, name, count, price }) => {
								const muted = count ? "" : "text-muted";

								return (
									<tr key={id}>
										<td className={`text-break ${muted}`}>
											<div>
												{name} <span className="fw-bold">{brand}</span>
											</div>
											<small className="text-muted">{number}</small>
										</td>
										<td className={`text-end ${muted}`}>
											{formatPrice(price)}
										</td>
										<td className={`text-end ${muted}`}>
											{count || "Нет в наличии"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{outOfStock > 0 && (
				<>
					{inStock === 0 && (
						<p className="text-muted mb-1">Аналогов в наличии нет</p>
					)}
					<button
						type="button"
						className="btn btn-link p-0"
						onClick={() => setShowAll(!showAll)}
					>
						{showAll
							? "Скрыть отсутствующие"
							: `Показать ещё ${outOfStock} отсутствующих`}
					</button>
				</>
			)}
		</>
	);
}
