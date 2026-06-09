const LOG_API_URL = 'http://4.224.186.213/evaluation-service/logs';

type Stack = 'backend' | 'frontend';
type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const BACKEND_PACKAGES = ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'] as const;
const FRONTEND_PACKAGES = ['api', 'component', 'hook', 'page', 'state', 'style'] as const;
const SHARED_PACKAGES = ['auth', 'config', 'middleware', 'utils'] as const;

type BackendPackage = typeof BACKEND_PACKAGES[number];
type FrontendPackage = typeof FRONTEND_PACKAGES[number];
type SharedPackage = typeof SHARED_PACKAGES[number];
type Package = BackendPackage | FrontendPackage | SharedPackage;

const VALID_STACKS: Stack[] = ['backend', 'frontend'];
const VALID_LEVELS: Level[] = ['debug', 'info', 'warn', 'error', 'fatal'];
const ALL_PACKAGES: readonly string[] = [...BACKEND_PACKAGES, ...FRONTEND_PACKAGES, ...SHARED_PACKAGES];

function validateParams(stack: Stack, level: Level, pkg: Package, message: string): void {
  if (!VALID_STACKS.includes(stack)) {
    throw new Error(`Invalid stack "${stack}". Must be one of: ${VALID_STACKS.join(', ')}`);
  }
  if (!VALID_LEVELS.includes(level)) {
    throw new Error(`Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(', ')}`);
  }
  if (!ALL_PACKAGES.includes(pkg)) {
    throw new Error(`Invalid package "${pkg}". Must be one of: ${ALL_PACKAGES.join(', ')}`);
  }
  if (stack === 'backend' && !BACKEND_PACKAGES.includes(pkg as BackendPackage) && !SHARED_PACKAGES.includes(pkg as SharedPackage)) {
    throw new Error(`Package "${pkg}" is not valid for stack "backend"`);
  }
  if (stack === 'frontend' && !FRONTEND_PACKAGES.includes(pkg as FrontendPackage) && !SHARED_PACKAGES.includes(pkg as SharedPackage)) {
    throw new Error(`Package "${pkg}" is not valid for stack "frontend"`);
  }
}

async function Log(stack: Stack, level: Level, pkg: Package, message: string): Promise<void> {
  validateParams(stack, level, pkg, message);

  let token = '';
  if (typeof process !== 'undefined' && process.env) {
    token = process.env.ACCESS_TOKEN || '';
  }
  if (!token && typeof window !== 'undefined') {
    token = (window as any).ACCESS_TOKEN || '';
  }

  if (!token) {
    if (typeof window !== 'undefined') {
      // In the browser, don't throw to prevent crashing the UI, just warn in console
      return;
    }
    throw new Error('ACCESS_TOKEN environment variable is not set');
  }

  try {
    const response = await fetch(LOG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stack,
        level,
        package: pkg,
        message: message.substring(0, 48)
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Log] API error: ${response.status} ${text}`);
    }
  } catch (error) {
    console.error(`[Log] Failed to send log: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { Log, Stack, Level, Package, BackendPackage, FrontendPackage, SharedPackage };
