export function LoadingState({
  title = 'Getting things ready',
  message = 'This should only take a moment.',
  compact = false,
}: {
  title?: string
  message?: string
  compact?: boolean
}) {
  return (
    <div className={`loading-state${compact ? ' loading-state--compact' : ''}`} role="status">
      <span className="loading-state__spinner" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}
