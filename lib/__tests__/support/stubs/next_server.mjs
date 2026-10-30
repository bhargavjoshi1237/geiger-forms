// Real NextResponse/NextRequest, but `after` queues its callback for flushAfter() since no request scope exists here.
import { createRequire } from "node:module";
import { testState } from "./state.mjs";

const real = createRequire(import.meta.url)("next/server");

export const NextResponse = real.NextResponse;
export const NextRequest = real.NextRequest;

export function after(callback) {
  testState.after.push(callback);
}
