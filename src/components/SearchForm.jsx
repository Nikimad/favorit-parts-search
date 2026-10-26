import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBrands } from "../store/searchSlice";

const EXAMPLES = ["7160500039S", "0189"];

export default function SearchForm() {
	const [value, setValue] = useState("");
	const status = useSelector((state) => state.search.status);
	const dispatch = useDispatch();
	const trimmed = value.trim();

	// shortcut: без debounce и автопоиска, запрос только по Enter или кнопке, чтобы не тратить квоту API
	const handleSubmit = (e) => {
		e.preventDefault();
		if (trimmed) dispatch(fetchBrands(trimmed));
	};

	const handleExample = (example) => {
		setValue(example);
		dispatch(fetchBrands(example));
	};

	return (
		<form className="text-body" onSubmit={handleSubmit}>
			<div className="row">
				<div className="col">
					<div className="form-floating">
						<input
							id="article"
							className="form-control w-100"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder="Артикул"
							autoComplete="off"
						/>
						<label htmlFor="article">Артикул</label>
					</div>
				</div>
				<div className="col-auto">
					<button
						type="submit"
						className="h-100 btn btn-lg btn-primary px-sm-5"
						disabled={!trimmed || status === "loading"}
					>
						Найти
					</button>
				</div>
			</div>
			<p className="mt-2 mb-0 text-white-50">
				Пример:{" "}
				{EXAMPLES.map((example) => (
					<button
						key={example}
						type="button"
						className="btn btn-link link-light btn-sm p-0 me-2 align-baseline"
						onClick={() => handleExample(example)}
					>
						{example}
					</button>
				))}
			</p>
		</form>
	);
}
