// Skipped test that documents a confirmed product bug and asserts the correct behaviour; RUN_KNOWN_BUGS=1 runs them to confirm they still fail.
import test from "node:test";

export function knownBug(name, fn) {
  return test(`BUG: ${name}`, process.env.RUN_KNOWN_BUGS ? {} : { skip: "known product bug, see the test name" }, fn);
}
