const COOKIE_KEY = 'octile_cookie_uuid';

export function getBrowserUUID() {
  return localStorage.getItem(COOKIE_KEY) || '';
}

export function captureCookieUUID(response) {
  if (!response?.headers) return;
  const cookieUUID = response.headers.get('X-Cookie-UUID');
  if (cookieUUID) {
    localStorage.setItem(COOKIE_KEY, cookieUUID);
  }
}
