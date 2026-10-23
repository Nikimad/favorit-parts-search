export default function Notice({ variant, onRetry, children }) {
  return (
    <div className={`alert alert-${variant} mb-0`}>
      {children}
      {onRetry && (
        <button type="button" className="btn btn-outline-secondary btn-sm ms-3" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}
