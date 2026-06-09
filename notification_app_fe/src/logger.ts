const LOG_API_URL = 'http://4.224.186.213/evaluation-service/logs';

let accessToken = '';

export function configure(token: string) {
  accessToken = token;
}

export async function Log(
  stack: 'backend' | 'frontend',
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  pkg: string,
  message: string
): Promise<void> {
  const token = accessToken || '';
  if (!token) return;

  try {
    await fetch(LOG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ stack, level, package: pkg, message })
    });
  } catch {
    // silently fail in browser
  }
}
