const GIT_STATUS_REFRESH_EVENT = 'app:git-status-refresh'

export function requestGitStatusRefresh(): void {
  window.dispatchEvent(new Event(GIT_STATUS_REFRESH_EVENT))
}

export function subscribeGitStatusRefresh(onRefresh: () => void): () => void {
  const handler = (): void => {
    onRefresh()
  }

  window.addEventListener(GIT_STATUS_REFRESH_EVENT, handler)

  return () => {
    window.removeEventListener(GIT_STATUS_REFRESH_EVENT, handler)
  }
}
