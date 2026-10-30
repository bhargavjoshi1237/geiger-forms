// Replaces supabase-js so a test run can never open a database connection; every call lands on the harness's fake.
import { testState } from "./state.mjs";

function current() {
  if (!testState.supabase) throw new Error("No fake Supabase installed; call resetWorld() first.");
  return testState.supabase;
}

export function createClient() {
  return {
    schema: (name) => current().schema(name),
    from: (table) => current().from(table),
    rpc: (name, args) => current().rpc(name, args),
    get auth() {
      return current().auth;
    },
    get storage() {
      return current().storage;
    },
  };
}
