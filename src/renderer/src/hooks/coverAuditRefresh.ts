const COVER_AUDIT_REFRESH_EVENT = 'app:cover-audit-refresh'

export function requestCoverAuditRefresh(): void {
  window.dispatchEvent(new Event(COVER_AUDIT_REFRESH_EVENT))
}

export function subscribeCoverAuditRefresh(onRefresh: () => void): () => void {
  const handler = (): void => {
    onRefresh()
  }

  window.addEventListener(COVER_AUDIT_REFRESH_EVENT, handler)

  return () => {
    window.removeEventListener(COVER_AUDIT_REFRESH_EVENT, handler)
  }
}
