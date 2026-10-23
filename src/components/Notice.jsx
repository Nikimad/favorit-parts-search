export default function Notice({ variant, children }) {
  return <div className={`alert alert-${variant} mb-0`}>{children}</div>
}
