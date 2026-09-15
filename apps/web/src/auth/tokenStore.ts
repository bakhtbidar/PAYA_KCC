type Listener = (token: string | null) => void;

let currentToken: string | null = null;
const listeners = new Set<Listener>();

/** In-memory only — never persisted to localStorage, so an XSS payload can't read it off disk. */
export const tokenStore = {
  get: () => currentToken,
  set: (token: string | null) => {
    currentToken = token;
    listeners.forEach((l) => l(token));
  },
  subscribe: (fn: Listener) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
