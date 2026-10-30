// Cookie and header stores backed by the harness jar; the real ones throw outside a request scope.
import { testState } from "./state.mjs";

export async function cookies() {
  return {
    get: (name) => (testState.cookies.has(name) ? { name, value: testState.cookies.get(name) } : undefined),
    getAll: () => [...testState.cookies].map(([name, value]) => ({ name, value })),
    set: (name, value) => testState.cookies.set(name, value),
  };
}

export async function headers() {
  return new Headers();
}
