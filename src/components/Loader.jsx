export default function Loader({ label }) {
	return (
		<div className="d-flex align-items-center gap-2" role="status">
			<div className="spinner-border text-primary" aria-hidden="true" />
			<span className={label ? "text-muted" : "visually-hidden"}>
				{label ?? "Загрузка…"}
			</span>
		</div>
	);
}
