type SessionExpiredListener = () => void | Promise<void>;

let sessionExpiredListener: SessionExpiredListener | null = null;

export function setSessionExpiredListener(listener: SessionExpiredListener): () => void {
  sessionExpiredListener = listener;
  return () => {
    if (sessionExpiredListener === listener) sessionExpiredListener = null;
  };
}

export function notifySessionExpired(): void {
  const listener = sessionExpiredListener;
  if (!listener) return;
  void Promise.resolve(listener()).catch(() => undefined);
}
