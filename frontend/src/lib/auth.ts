/**
 * SETU Auth Library
 *
 * LOCAL_ADAPTER: In production, swap the `localAuth` calls below for
 * AWS Cognito Amplify (`signIn`, `signOut`, `fetchAuthSession`).
 * The interface is identical — role is read from token claims either way.
 *
 * Local demo credentials:
 *   coordinator.demo / Setu@2024!  → COORDINATOR
 *   camp.alpha        / Setu@2024!  → CAMP (Camp-A)
 *   camp.bravo        / Setu@2024!  → CAMP (Camp-B)
 *   camp.charlie      / Setu@2024!  → CAMP (Camp-C)
 *   warehouse.demo    / Setu@2024!  → WAREHOUSE
 *   driver.demo       / Setu@2024!  → DRIVER
 */

export type UserRole = 'coordinator' | 'camp' | 'warehouse' | 'driver';

export interface SetuUser {
  username: string;
  role: UserRole;
  locationId?: string;   // e.g. 'Camp-A' for camp officers
  displayName: string;
  avatar: string;        // initials for avatar
}

// ---------------------------------------------------------------------------
// Local credentials store (replace with Cognito in production)
// ---------------------------------------------------------------------------

const DEMO_USERS: Record<string, SetuUser & { password: string }> = {
  'coordinator.demo': {
    username: 'coordinator.demo',
    password: 'Setu@2024!',
    role: 'coordinator',
    displayName: 'Crisis Coordinator',
    avatar: 'CC',
  },
  'camp.alpha': {
    username: 'camp.alpha',
    password: 'Setu@2024!',
    role: 'camp',
    locationId: 'Camp-A',
    displayName: 'Camp Alpha Officer',
    avatar: 'CA',
  },
  'camp.bravo': {
    username: 'camp.bravo',
    password: 'Setu@2024!',
    role: 'camp',
    locationId: 'Camp-B',
    displayName: 'Camp Bravo Officer',
    avatar: 'CB',
  },
  'camp.charlie': {
    username: 'camp.charlie',
    password: 'Setu@2024!',
    role: 'camp',
    locationId: 'Camp-C',
    displayName: 'Camp Charlie Officer',
    avatar: 'CC',
  },
  'warehouse.demo': {
    username: 'warehouse.demo',
    password: 'Setu@2024!',
    role: 'warehouse',
    locationId: 'WH-1',
    displayName: 'Warehouse Operator',
    avatar: 'WO',
  },
  'driver.demo': {
    username: 'driver.demo',
    password: 'Setu@2024!',
    role: 'driver',
    displayName: 'Field Driver',
    avatar: 'FD',
  },
};

const SESSION_KEY = 'setu_session';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function signIn(username: string, password: string): Promise<SetuUser> {
  // LOCAL_ADAPTER: replace with Amplify.Auth.signIn(username, password)
  const user = DEMO_USERS[username.toLowerCase().trim()];
  if (!user || user.password !== password) {
    throw new Error('Invalid credentials');
  }
  const { password: _p, ...session } = user;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Set cookie for middleware (edge runtime cannot read sessionStorage)
    document.cookie = `setu_session=${encodeURIComponent(JSON.stringify({ username: session.username, role: session.role }))};path=/;samesite=strict`;
  }
  return session;
}

export async function signOut(): Promise<void> {
  // LOCAL_ADAPTER: replace with Amplify.Auth.signOut()
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
    // Clear middleware cookie
    document.cookie = 'setu_session=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

export function getCurrentUser(): SetuUser | null {
  // LOCAL_ADAPTER: replace with Amplify.Auth.currentAuthenticatedUser()
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  
  // Prevent infinite redirect loops: if we have a session in storage but no cookie,
  // the middleware will bounce us. Clear the stale session and require a fresh login.
  if (!document.cookie.includes('setu_session=')) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  try {
    return JSON.parse(raw) as SetuUser;
  } catch {
    return null;
  }
}

/**
 * Returns the redirect path for the logged-in role.
 */
export function getHomeForRole(user: SetuUser): string {
  switch (user.role) {
    case 'coordinator': return '/command';
    case 'camp':        return `/field?role=camp&location=${user.locationId ?? 'Camp-A'}`;
    case 'warehouse':   return '/warehouse';
    case 'driver':      return '/driver';
    default:            return '/command';
  }
}

/**
 * Demo credentials list for the login page helper.
 */
export const DEMO_CREDENTIALS = [
  { username: 'coordinator.demo', password: 'Setu@2024!', label: 'Crisis Coordinator', role: 'coordinator' as UserRole },
  { username: 'camp.alpha',       password: 'Setu@2024!', label: 'Camp Alpha Officer', role: 'camp' as UserRole },
  { username: 'camp.bravo',       password: 'Setu@2024!', label: 'Camp Bravo Officer', role: 'camp' as UserRole },
  { username: 'warehouse.demo',   password: 'Setu@2024!', label: 'Warehouse Operator', role: 'warehouse' as UserRole },
  { username: 'driver.demo',      password: 'Setu@2024!', label: 'Field Driver',        role: 'driver' as UserRole },
];
