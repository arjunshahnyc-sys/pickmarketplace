// Storage utilities for user authentication and session management

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: 'free' | 'premium';
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  expiresAt: string;
}

export interface SearchCount {
  date: string;
  count: number;
}

const USERS_KEY = 'pick_users';
const SESSION_KEY = 'pick_session';
const SEARCH_COUNT_KEY = 'pick_search_count';

// User management
export function getAllUsers(): Record<string, User> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : {};
}

export function getUser(email: string): User | null {
  const users = getAllUsers();
  return users[email] || null;
}

export function saveUser(user: User): void {
  const users = getAllUsers();
  users[user.email] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function updateUserPlan(email: string, plan: 'free' | 'premium'): void {
  const user = getUser(email);
  if (user) {
    user.plan = plan;
    saveUser(user);
  }
}

// Session management
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;

  const session: Session = JSON.parse(data);
  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    clearSession();
    return null;
  }

  return session;
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// Search count management
export function getSearchCount(): SearchCount {
  if (typeof window === 'undefined') return { date: '', count: 0 };
  const data = localStorage.getItem(SEARCH_COUNT_KEY);
  if (!data) return { date: getTodayDate(), count: 0 };

  const searchCount: SearchCount = JSON.parse(data);
  // Reset count if it's a new day
  if (searchCount.date !== getTodayDate()) {
    return { date: getTodayDate(), count: 0 };
  }

  return searchCount;
}

export function incrementSearchCount(): number {
  const searchCount = getSearchCount();
  const newCount = searchCount.count + 1;
  const updated = { date: getTodayDate(), count: newCount };
  localStorage.setItem(SEARCH_COUNT_KEY, JSON.stringify(updated));
  return newCount;
}

export function resetDailySearchCount(): void {
  const reset = { date: getTodayDate(), count: 0 };
  localStorage.setItem(SEARCH_COUNT_KEY, JSON.stringify(reset));
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Simple hash function for passwords (in production, use bcrypt on backend)
export function hashPassword(password: string): string {
  // This is a simple hash - in production, use proper backend hashing
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
