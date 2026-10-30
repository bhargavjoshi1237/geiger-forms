// State shared by the stubs and the test harness; held on globalThis so it survives any module-URL differences.
export const testState = (globalThis.__geigerTestState ??= { after: [], cookies: new Map(), supabase: null });
