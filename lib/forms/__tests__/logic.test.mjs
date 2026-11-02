// Form logic engine: conditions, pages, validation, formulas, scoring, quiz, outcomes, endings, orders, recall.
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { checkFormula } from "../formula.js";
import {
  coerceDefaultAnswer,
  computeOrder,
  detectRespondent,
  displayValue,
  evaluateCondition,
  evaluateFormula,
  gradeQuiz,
  includedFields,
  interpolate,
  isFieldVisible,
  labelAnswers,
  matchesConditions,
  normalizeOperator,
  numericValue,
  operatorNeedsValue,
  resolveEnding,
  resolveOutcome,
  safeHttpUrl,
  scoreResponse,
  sensitiveIdentity,
  splitPages,
  stripHiddenAnswers,
  validateAnswers,
  validateField,
  visibleFieldIds,
  visiblePages,
  withComputed,
} from "../logic.js";

const f = (id, type = "text", extra = {}) => ({ id, type, title: id, ...extra });
const when = (fieldId, operator, value) => ({ fieldId, operator, value });

describe("evaluateCondition", () => {
  const cases = [
    ["equals", "Yes", "yes", true],
    ["equals", "  Yes ", "yes", true],
    ["equals", "No", "yes", false],
    ["not_equals", "No", "yes", true],
    ["not_equals", "YES", "yes", false],
    ["contains", "Hello world", "WORLD", true],
    ["contains", "Hello", "x", false],
    ["not_contains", "Hello", "x", true],
    ["not_contains", "Hello", "ELL", false],
    ["starts_with", "Hello", "he", true],
    ["starts_with", "Hello", "lo", false],
    ["gt", 5, 4, true],
    ["gt", 5, 5, false],
    ["gte", 5, 5, true],
    ["gte", 4, 5, false],
    ["lt", 4, 5, true],
    ["lt", 5, 5, false],
    ["lte", 5, 5, true],
    ["lte", 6, 5, false],
    ["gt", "10", 9, true],
    ["gt", "abc", 1, false],
    ["lt", "abc", 1, false],
    ["gt", 5, "abc", false],
  ];
  for (const [operator, answer, expected, result] of cases) {
    test(`${JSON.stringify(answer)} ${operator} ${JSON.stringify(expected)} is ${result}`, () => {
      assert.equal(evaluateCondition(when("a", operator, expected), { a: answer }), result);
    });
  }

  for (const value of [undefined, null, "", "   ", [], false, { first: "", last: " " }, { a: [] }]) {
    test(`${JSON.stringify(value)} counts as empty`, () => {
      assert.equal(evaluateCondition(when("a", "is_empty"), { a: value }), true);
      assert.equal(evaluateCondition(when("a", "is_not_empty"), { a: value }), false);
    });
  }

  for (const value of [0, "x", ["a"], true, { first: "A", last: "" }]) {
    test(`${JSON.stringify(value)} counts as answered`, () => {
      assert.equal(evaluateCondition(when("a", "is_empty"), { a: value }), false);
      assert.equal(evaluateCondition(when("a", "is_not_empty"), { a: value }), true);
    });
  }

  test("multi-value answers match when any entry matches, negations when none do", () => {
    const answers = { a: ["Red", "Blue"] };
    assert.equal(evaluateCondition(when("a", "equals", "blue"), answers), true);
    assert.equal(evaluateCondition(when("a", "equals", "green"), answers), false);
    assert.equal(evaluateCondition(when("a", "not_equals", "green"), answers), true);
    assert.equal(evaluateCondition(when("a", "not_equals", "red"), answers), false);
    assert.equal(evaluateCondition(when("a", "contains", "lu"), answers), true);
    assert.equal(evaluateCondition(when("a", "not_contains", "lu"), answers), false);
    assert.equal(evaluateCondition(when("a", "starts_with", "bl"), answers), true);
  });

  test("composite answers compare on their text", () => {
    assert.equal(evaluateCondition(when("a", "contains", "lovelace"), { a: { first: "Ada", last: "Lovelace" } }), true);
  });

  test("zero is an answer to a numeric comparison, and a blank entry in a list never is", () => {
    assert.equal(evaluateCondition(when("a", "lt", 5), { a: 0 }), true);
    assert.equal(evaluateCondition(when("a", "gte", 0), { a: "0" }), true);
    assert.equal(evaluateCondition(when("a", "lt", 5), { a: ["", null, "9"] }), false);
    assert.equal(evaluateCondition(when("a", "lt", 5), { a: ["", "1"] }), true);
    assert.equal(evaluateCondition(when("a", "lt", 5), { a: "   " }), false);
    assert.equal(evaluateCondition(when("a", "lt", 5), { a: true }), false);
    assert.equal(evaluateCondition(when("a", "gt", 4), { a: ["x", "5"] }), true);
    assert.equal(evaluateCondition(when("a", "gt", 9), { a: ["5", "6"] }), false);
  });

  test("legacy operator labels are understood", () => {
    assert.equal(normalizeOperator("Equals"), "equals");
    assert.equal(normalizeOperator("Does Not Equal"), "not_equals");
    assert.equal(normalizeOperator("Contains"), "contains");
    assert.equal(normalizeOperator("Is Empty"), "is_empty");
    assert.equal(normalizeOperator(undefined), "equals");
    assert.equal(evaluateCondition(when("a", "Does Not Equal", "x"), { a: "y" }), true);
    assert.equal(evaluateCondition(when("a", "Is Empty"), {}), true);
  });

  test("operatorNeedsValue is false only for the emptiness checks", () => {
    assert.equal(operatorNeedsValue("is_empty"), false);
    assert.equal(operatorNeedsValue("Is Empty"), false);
    assert.equal(operatorNeedsValue("is_not_empty"), false);
    assert.equal(operatorNeedsValue("gt"), true);
  });

  test("blank answers must not satisfy numeric comparisons (lt 5 on an unanswered field)", () => {
    assert.equal(evaluateCondition(when("a", "lt", 5), {}), false);
    assert.equal(evaluateCondition(when("a", "lte", 0), { a: "" }), false);
    assert.equal(evaluateCondition(when("a", "gte", 0), { a: null }), false);
    assert.equal(evaluateCondition(when("a", "gt", -1), {}), false);
  });

  test("numeric comparisons on multi-value answers match when any entry matches", () => {
    assert.equal(evaluateCondition(when("a", "gt", 4), { a: ["5", "6"] }), true);
  });

  const ordered = [
    ["date", "2026-06-01", "2026-01-01", { gt: true, gte: true, lt: false, lte: false }],
    ["date", "2026-01-01", "2026-06-01", { gt: false, gte: false, lt: true, lte: true }],
    ["same date", "2026-06-01", "2026-06-01", { gt: false, gte: true, lt: false, lte: true }],
    ["time", "14:30", "09:15", { gt: true, gte: true, lt: false, lte: false }],
    ["same time with seconds", "14:30:00", "14:30", { gt: false, gte: true, lt: false, lte: true }],
    ["date-time", "2026-06-01T14:30", "2026-06-01T09:15", { gt: true, gte: true, lt: false, lte: false }],
    ["date-time with a space", "2026-06-01 14:30", "2026-06-01T09:15", { gt: true, gte: true, lt: false, lte: false }],
    ["date-time against a date", "2026-06-01T09:15", "2026-06-01", { gt: true, gte: true, lt: false, lte: false }],
    ["zoned date-times compare as instants", "2026-06-01T10:00:00+05:30", "2026-06-01T05:00:00Z", { gt: false, gte: false, lt: true, lte: true }],
  ];
  for (const [name, answer, expected, results] of ordered) {
    for (const [operator, result] of Object.entries(results)) {
      test(`${name}: ${answer} ${operator} ${expected} is ${result}`, () => {
        assert.equal(evaluateCondition(when("a", operator, expected), { a: answer }), result);
      });
    }
  }

  test("dates and times never compare with each other, numbers or free text", () => {
    assert.equal(evaluateCondition(when("a", "gt", "09:00"), { a: "2026-06-01" }), false);
    assert.equal(evaluateCondition(when("a", "lt", "2026-06-01"), { a: "09:00" }), false);
    assert.equal(evaluateCondition(when("a", "gt", "2026-01-01"), { a: "tomorrow" }), false);
    assert.equal(evaluateCondition(when("a", "gt", "2026-01-01"), { a: 20270101 }), false);
    assert.equal(evaluateCondition(when("a", "gt", 2020), { a: "2026-06-01" }), false);
  });

  test("impossible dates never match", () => {
    assert.equal(evaluateCondition(when("a", "gt", "2026-01-01"), { a: "2026-02-31" }), false);
    assert.equal(evaluateCondition(when("a", "lt", "2026-13-01"), { a: "2026-02-01" }), false);
  });

  test("a date condition drives visibility", () => {
    const fields = [{ id: "d", type: "date" }, { id: "late", type: "text", conditions: [when("d", "gte", "2026-06-01")] }];
    assert.equal(visibleFieldIds(fields, { d: "2026-07-01" }).has("late"), true);
    assert.equal(visibleFieldIds(fields, { d: "2026-05-01" }).has("late"), false);
  });
});

describe("matchesConditions", () => {
  const a = when("a", "equals", "1");
  const b = when("b", "equals", "1");

  test("no usable conditions always match", () => {
    assert.equal(matchesConditions(undefined, "all", {}), true);
    assert.equal(matchesConditions([], "any", {}), true);
    assert.equal(matchesConditions([null, { operator: "equals", value: "1" }], "all", {}), true);
  });

  test("any is the default and needs one match", () => {
    assert.equal(matchesConditions([a, b], undefined, { a: "1" }), true);
    assert.equal(matchesConditions([a, b], "any", { b: "1" }), true);
    assert.equal(matchesConditions([a, b], "any", {}), false);
  });

  test("all needs every match", () => {
    assert.equal(matchesConditions([a, b], "all", { a: "1" }), false);
    assert.equal(matchesConditions([a, b], "all", { a: "1", b: "1" }), true);
  });
});

describe("visibility and pages", () => {
  const chain = [
    f("a"),
    f("b", "text", { conditions: [when("a", "equals", "yes")] }),
    f("c", "text", { conditions: [when("b", "equals", "go")] }),
    f("d", "text", { conditions: [when("c", "is_not_empty")] }),
  ];

  test("a chain of conditions shows while each link holds", () => {
    assert.deepEqual([...visibleFieldIds(chain, { a: "yes", b: "go", c: "x" })], ["a", "b", "c", "d"]);
  });

  test("hiding a field cascades: stale answers behind it don't keep dependents visible", () => {
    assert.deepEqual([...visibleFieldIds(chain, { a: "no", b: "go", c: "x", d: "y" })], ["a"]);
    assert.deepEqual([...visibleFieldIds(chain, { a: "yes", b: "stop", c: "x" })], ["a", "b"]);
  });

  test("conditions honour conditionLogic", () => {
    const fields = [f("a"), f("b"), f("c", "text", { conditions: [when("a", "equals", "1"), when("b", "equals", "1")], conditionLogic: "all" })];
    assert.equal(visibleFieldIds(fields, { a: "1" }).has("c"), false);
    assert.equal(visibleFieldIds(fields, { a: "1", b: "1" }).has("c"), true);
  });

  test("excluded fields are never visible and can't drive anything", () => {
    assert.deepEqual(includedFields([f("a", "text", { included: false }), null, f("b")]).map((x) => x.id), ["b"]);
    assert.equal(visibleFieldIds([f("a", "text", { included: false })], {}).has("a"), false);
  });

  test("hidden-type fields ignore their own conditions but not their page", () => {
    const fields = [f("x"), f("h", "hidden", { conditions: [when("x", "equals", "never")] })];
    assert.equal(visibleFieldIds(fields, {}).has("h"), true);
    const onSkippedPage = [f("x"), f("p", "page", { conditions: [when("x", "equals", "go")] }), f("h", "hidden")];
    assert.equal(visibleFieldIds(onSkippedPage, {}).has("h"), false);
  });

  test("a page break's conditions skip everything until the next break", () => {
    const fields = [
      f("x"),
      f("p1", "page", { conditions: [when("x", "equals", "go")] }),
      f("y"),
      f("p2", "page"),
      f("z"),
    ];
    assert.deepEqual([...visibleFieldIds(fields, { x: "no", y: "stale" })], ["x", "p2", "z"]);
    assert.deepEqual([...visibleFieldIds(fields, { x: "go" })], ["x", "p1", "y", "p2", "z"]);
  });

  test("a field on a skipped page blanks for conditions further down", () => {
    const fields = [
      f("x"),
      f("p1", "page", { conditions: [when("x", "equals", "go")] }),
      f("y"),
      f("p2", "page"),
      f("z", "text", { conditions: [when("y", "equals", "secret")] }),
    ];
    assert.equal(visibleFieldIds(fields, { x: "no", y: "secret" }).has("z"), false);
  });

  test("a later field's answer is read raw by an earlier forward reference", () => {
    const fields = [f("a", "text", { conditions: [when("b", "equals", "1")] }), f("b")];
    assert.equal(visibleFieldIds(fields, { b: "1" }).has("a"), true);
  });

  test("calculated values are condition sources", () => {
    const fields = [
      f("n", "number"),
      f("c", "calculated", { formula: "{n} * 2" }),
      f("t", "text", { conditions: [when("c", "gte", 10)] }),
    ];
    assert.equal(visibleFieldIds(fields, { n: 5 }).has("t"), true);
    assert.equal(visibleFieldIds(fields, { n: 4 }).has("t"), false);
    assert.equal(visibleFieldIds(fields, { n: 1, c: 999 }).has("t"), false, "a client-sent calculated value is ignored");
  });

  test("splitPages groups fields and titles untitled breaks", () => {
    const pages = splitPages([f("a"), { id: "p", type: "page" }, f("b"), f("q", "page", { title: "Last" }), f("c")], "Start");
    assert.deepEqual(pages.map((p) => p.title), ["Start", "Page 2", "Last"]);
    assert.deepEqual(pages.map((p) => p.fields.map((x) => x.id)), [["a"], ["b"], ["c"]]);
  });

  test("visiblePages drops skipped pages and hidden fields", () => {
    const fields = [
      f("x"),
      f("hide", "text", { conditions: [when("x", "equals", "show")] }),
      f("p", "page", { conditions: [when("x", "equals", "go")] }),
      f("y"),
    ];
    const pages = visiblePages(fields, { x: "no" });
    assert.equal(pages.length, 1);
    assert.deepEqual(pages[0].fields.map((p) => p.id), ["x"]);
    assert.deepEqual(visiblePages(fields, { x: "go" }).map((p) => p.id), ["page-0", "p"]);
  });

  test("isFieldVisible cascades only when given the whole form", () => {
    const target = chain[2];
    assert.equal(isFieldVisible(target, { a: "no", b: "go" }), true);
    assert.equal(isFieldVisible(target, { a: "no", b: "go" }, chain), false);
  });

  test("stripHiddenAnswers keeps only visible inputs and internal keys", () => {
    const fields = [
      f("a"),
      f("b", "text", { conditions: [when("a", "equals", "yes")] }),
      f("calc", "calculated", { formula: "1" }),
      f("head", "heading"),
      f("zero", "number"),
      f("off", "checkbox"),
    ];
    const out = stripHiddenAnswers(fields, { a: "no", b: "secret", calc: 9, head: "x", zero: 0, off: false, __coupon: "SAVE", stranger: "z" });
    assert.deepEqual(out, { a: "no", zero: 0, off: false, __coupon: "SAVE" });
  });

  test("a hidden field must not satisfy a numeric condition further down", () => {
    const fields = [
      f("a"),
      f("age", "number", { conditions: [when("a", "equals", "yes")] }),
      f("minor", "text", { conditions: [when("age", "lt", 18)] }),
    ];
    assert.equal(visibleFieldIds(fields, { a: "no", age: 40 }).has("minor"), false);
  });
});

describe("validateField", () => {
  test("required rejects empty values of every shape, optional accepts them", () => {
    for (const value of [undefined, null, "", "  ", [], false, { first: "" }]) {
      assert.equal(validateField(f("x", "text", { required: true }), value), "This field is required.");
      assert.equal(validateField(f("x", "text"), value), null);
    }
    assert.equal(validateField(f("x", "number", { required: true }), 0), null, "0 is an answer");
  });

  const rejects = [
    ["email", {}, "nope", /valid email/],
    ["email", {}, "a@b", /valid email/],
    ["url", {}, "example.com", /full URL/],
    ["url", {}, "ftp://example.com", /full URL/],
    ["url", {}, "https://localhost", /full URL/],
    ["phone", {}, "12345", /valid phone/],
    ["number", {}, "abc", /Enter a number/],
    ["currency", {}, "abc", /Enter a number/],
    ["rating", {}, "abc", /Enter a number/],
    ["scale", {}, "abc", /Enter a number/],
    ["nps", {}, "abc", /Enter a number/],
    ["number", { validation: { min: 5 } }, 4, /at least 5/],
    ["number", { validation: { max: 5 } }, 6, /at most 5/],
    ["number", { validation: { min: 0 } }, -1, /at least 0/],
    ["currency", { validation: { max: 10 } }, 11, /at most 10/],
    ["opinion", {}, 6, /one of the options/],
    ["opinion", {}, 0, /one of the options/],
    ["opinion", {}, 2.5, /one of the options/],
    ["opinion", { config: { steps: 3 } }, 4, /one of the options/],
    ["picture", { options: ["A"] }, "B", /one of the options/],
    ["picture", { options: ["A"] }, ["A"], /one of the options/],
    ["multipicture", { options: ["A"] }, "A", /one of the options/],
    ["multipicture", { options: ["A"] }, ["A", "B"], /one of the options/],
    ["consent", {}, "yes", /Tick the box/],
    ["text", { validation: { minLength: 3 } }, "ab", /at least 3/],
    ["text", { validation: { maxLength: 3 } }, "abcd", /at most 3/],
    ["textarea", { validation: { maxLength: 3 } }, "abcd", /at most 3/],
    ["email", { validation: { maxLength: 4 } }, "a@b.co", /at most 4/],
    ["text", { validation: { pattern: "^\\d+$" } }, "abc", /expected format/],
    ["text", { validation: { pattern: "^\\d+$", patternMessage: "Digits only" } }, "abc", /Digits only/],
    ["multiselect", { validation: { minSelect: 2 } }, ["a"], /at least 2/],
    ["multiselect", { validation: { maxSelect: 1 } }, ["a", "b"], /at most 1/],
    ["name", { required: true }, { first: "Ada", last: " " }, /first and last/],
    ["address", { required: true }, { line1: "1 St" }, /street and city/],
    ["matrix", { required: true, config: { rows: ["r1", "r2"] } }, { r1: "x" }, /every row/],
    ["repeater", { config: { minRows: 2 } }, [{}], /at least 2 entries/],
    ["repeater", { config: { minRows: 1, subFields: [{ id: "s", type: "email", label: "Mail" }] } }, [{ s: "bad" }], /Mail: Enter a valid email/],
    ["repeater", { config: { subFields: [{ id: "s", type: "text", required: true }] } }, [{}], /A row: This field is required/],
    ["product", { required: true }, -1, /Choose a quantity/],
  ];
  for (const [type, extra, value, message] of rejects) {
    test(`${type} rejects ${JSON.stringify(value)} with ${JSON.stringify(extra)}`, () => {
      assert.match(validateField(f("x", type, extra), value) ?? "(accepted)", message);
    });
  }

  const accepts = [
    ["email", {}, " a@b.co "],
    ["url", {}, "https://example.com/path?q=1"],
    ["url", {}, "http://example.com"],
    ["phone", {}, "+1 (555) 010-9999"],
    ["number", { validation: { min: 0, max: 5 } }, "5"],
    ["number", { validation: { min: "", max: "" } }, 999],
    ["opinion", {}, 5],
    ["opinion", { config: { steps: 7 } }, 7],
    ["picture", { options: ["A"] }, "A"],
    ["multipicture", { options: ["A", "B"] }, ["B"]],
    ["consent", { required: true }, true],
    ["text", { validation: { minLength: 2, maxLength: 3 } }, " abc "],
    ["text", { validation: { pattern: "^\\d+$" } }, "123"],
    ["text", { validation: { pattern: "[" } }, "any"],
    ["multiselect", { validation: { minSelect: 1, maxSelect: 2 } }, ["a", "b"]],
    ["name", { required: true }, { first: "Ada", last: "Lovelace" }],
    ["address", { required: true }, { line1: "1 St", city: "Town" }],
    ["matrix", { required: true, config: { rows: ["r1"] } }, { r1: "x" }],
    ["repeater", { config: { minRows: 1, subFields: [{ id: "s", type: "text", required: true }] } }, [{ s: "v" }]],
    ["product", { required: true }, 2],
  ];
  for (const [type, extra, value] of accepts) {
    test(`${type} accepts ${JSON.stringify(value)} with ${JSON.stringify(extra)}`, () => {
      assert.equal(validateField(f("x", type, extra), value), null);
    });
  }

  test("a required repeater with no rows is unanswered", () => {
    assert.equal(validateField(f("x", "repeater", { config: { minRows: 1 }, required: true }), []), "This field is required.");
  });

  test("unchecked required checkbox is treated as unanswered", () => {
    assert.equal(validateField(f("x", "checkbox", { required: true }), false), "This field is required.");
  });

  test("single and multi choice answers must be one of the offered options", () => {
    assert.notEqual(validateField(f("x", "select", { options: ["A", "B"] }), "Z"), null);
    assert.notEqual(validateField(f("x", "dropdown", { options: ["A", "B"] }), "Z"), null);
    assert.notEqual(validateField(f("x", "multiselect", { options: ["A", "B"] }), ["A", "Z"]), null);
    assert.notEqual(validateField(f("x", "multiselect", { options: ["A", "B"] }), "A"), null);
  });

  test("rating, NPS and scale answers must stay inside the type's range", () => {
    assert.notEqual(validateField(f("x", "nps"), 11), null);
    assert.notEqual(validateField(f("x", "nps"), -1), null);
    assert.notEqual(validateField(f("x", "rating", { config: { max: 5 } }), 6), null);
    assert.notEqual(validateField(f("x", "scale", { config: { min: 1, max: 10 } }), 1000), null);
  });

  test("a composite answer with non-string parts is rejected, not a thrown TypeError", () => {
    assert.notEqual(validateField(f("x", "name", { required: true }), { first: 1, last: "x" }), null);
    assert.notEqual(validateField(f("x", "address", { required: true }), { line1: 1, city: "x" }), null);
  });

  test("text rules can't be bypassed by sending a non-string answer", () => {
    assert.notEqual(validateField(f("x", "text", { validation: { pattern: "^\\d+$" } }), ["abc"]), null);
    assert.notEqual(validateField(f("x", "text", { validation: { maxLength: 3 } }), { value: "far too long" }), null);
  });

  test("a repeater answer that isn't an array is rejected", () => {
    assert.notEqual(validateField(f("x", "repeater", { config: { minRows: 2 } }), "not rows"), null);
  });

  test("an unparseable date is rejected", () => {
    assert.notEqual(validateField(f("x", "date"), "garbage"), null);
  });
});

describe("validateField shapes the filler really stores", () => {
  const options = ["A", "B", "Other"];
  const legit = [
    ["select", { options }, "Other"],
    ["dropdown", { options }, "A"],
    ["multiselect", { options }, ["A", "Other"]],
    ["ranking", { options }, ["B", "A", "Other"]],
    ["ranking", { options }, ["B"]],
    ["picture", { options }, "A"],
    ["multipicture", { options }, ["B"]],
    ["select", { options: ["1", "2"] }, 1],
    ["select", {}, "no options configured"],
    ["matrix", { options, config: { rows: ["r1", "r2"] } }, { r1: "A" }],
    ["matrix", { options, config: { rows: ["r1"] } }, { r1: "A", removed: "gone" }],
    ["rating", {}, 5],
    ["rating", { config: { max: 10 } }, "10"],
    ["rating", { config: { max: 99 } }, 10],
    ["scale", {}, 1],
    ["scale", { config: { min: 0, max: 4 } }, 0],
    ["scale", { config: { min: -2, max: 2 } }, -2],
    ["nps", {}, 0],
    ["nps", {}, "10"],
    ["product", { config: { quantityMode: "fixed" } }, true],
    ["date", {}, "2026-02-28"],
    ["date", {}, "2024-02-29"],
    ["date", {}, "2026-02-28T10:00:00.000Z"],
    ["time", {}, "23:59"],
    ["time", {}, "00:00:30"],
    ["datetime", {}, "2026-02-28T10:00"],
    ["datetime", {}, "2026-02-28T10:00:15"],
    ["datetime", {}, "2026-02-28T10:00:00+05:30"],
    ["name", {}, { first: "Ada", last: null }],
    ["address", {}, { line1: "1 St", city: "Town", country: "" }],
    ["booking", {}, "2030-01-15T10:00:00.000Z"],
    ["checkbox", {}, true],
    ["repeater", { config: { subFields: [{ id: "d", type: "dropdown", options }, { id: "n", type: "number" }] } }, [{ d: "A", n: 2 }, {}]],
  ];
  for (const [type, extra, value] of legit) {
    test(`${type} keeps accepting ${JSON.stringify(value)} with ${JSON.stringify(extra)}`, () => {
      assert.equal(validateField(f("x", type, extra), value), null);
    });
  }

  const forged = [
    ["select", { options }, ["A"]],
    ["select", { options }, { a: "A" }],
    ["select", { options }, "a"],
    ["select", { optionPoints: { A: 1 } }, "1000"],
    ["multiselect", { options }, ["A", "A"]],
    ["ranking", { options }, "A"],
    ["ranking", { options }, ["A", "Z"]],
    ["ranking", { options }, ["A", "A"]],
    ["picture", {}, ["A"]],
    ["matrix", { options, config: { rows: ["r1"] } }, { r1: "Z" }],
    ["matrix", { options, config: { rows: ["r1"] } }, ["A"]],
    ["matrix", { options, config: { rows: ["r1"] } }, { r1: ["A"] }],
    ["matrix", { required: true, options, config: { rows: ["constructor"] } }, { other: "A" }],
    ["nps", {}, 2.5],
    ["rating", {}, 0],
    ["rating", {}, 1.5],
    ["rating", { config: { max: 99 } }, 11],
    ["scale", {}, 0],
    ["scale", { config: { min: 1, max: 5 } }, 2.5],
    ["number", {}, ["5"]],
    ["number", {}, true],
    ["email", {}, ["a@b.co"]],
    ["url", {}, ["https://x.test"]],
    ["phone", {}, 5551234567],
    ["textarea", {}, 5],
    ["date", {}, "2026-02-31"],
    ["date", {}, "2026"],
    ["date", {}, 20260101],
    ["time", {}, "25:00"],
    ["time", {}, "noon"],
    ["datetime", {}, "yesterday"],
    ["datetime", {}, "2026-13-01T10:00"],
    ["name", {}, "Ada Lovelace"],
    ["name", {}, { first: ["Ada"] }],
    ["address", {}, ["1 St"]],
    ["repeater", {}, { 0: "row" }],
    ["repeater", {}, ["row"]],
    ["repeater", {}, [{ s: { nested: "x" } }]],
    ["booking", {}, ["2030-01-15T10:00:00.000Z"]],
    ["checkbox", {}, { a: 1 }],
  ];
  for (const [type, extra, value] of forged) {
    test(`${type} rejects forged ${JSON.stringify(value)} with ${JSON.stringify(extra)}`, () => {
      assert.notEqual(validateField(f("x", type, extra), value), null);
    });
  }

  test("a required composite whose parts are blank still reads as unfinished", () => {
    assert.match(validateField(f("x", "name", { required: true }), { first: "Ada", last: null }), /first and last/);
  });

  test("the range rules accept what the rating and scale controls draw, including their clamps", () => {
    assert.equal(validateField(f("x", "rating", { config: { max: 1 } }), 3), null, "max clamps up to 3");
    assert.equal(validateField(f("x", "scale", { config: { min: 1, max: 1 } }), 2), null, "the span is at least 1");
    assert.notEqual(validateField(f("x", "scale", { config: { min: 1, max: 999 } }), 22), null, "the span is at most 20");
  });
});

describe("coerceDefaultAnswer", () => {
  test("defaults take the stored shape, matching options loosely like prefill does", () => {
    assert.equal(coerceDefaultAnswer(f("x", "select", { options: ["Yes", "No"] }), " yes "), "Yes");
    assert.deepEqual(coerceDefaultAnswer(f("x", "multiselect", { options: ["A", "B"] }), "a, B"), ["A", "B"]);
    assert.equal(coerceDefaultAnswer(f("x", "text"), 5), "5");
    assert.deepEqual(coerceDefaultAnswer(f("x", "name"), "Ada King Lovelace"), { first: "Ada", last: "King Lovelace" });
    assert.equal(coerceDefaultAnswer(f("x", "number"), "5"), "5");
  });

  test("a default that doesn't fit, or one a respondent must give themselves, is no answer", () => {
    assert.equal(coerceDefaultAnswer(f("x", "select", { options: ["Yes"] }), "Maybe"), undefined);
    assert.equal(coerceDefaultAnswer(f("x", "multiselect", { options: ["Yes"] }), "Maybe"), undefined);
    for (const type of ["consent", "file", "signature", "booking"]) assert.equal(coerceDefaultAnswer(f("x", type), true), undefined);
    assert.equal(coerceDefaultAnswer(f("x", "text"), ""), undefined);
  });
});

describe("validateAnswers", () => {
  const fields = [
    f("a", "text", { required: true }),
    f("b", "text", { required: true, conditions: [when("a", "equals", "x")] }),
    f("h", "hidden", { required: true }),
    f("c", "calculated", { required: true, formula: "1" }),
    f("t", "heading", { required: true }),
    f("gone", "text", { required: true, included: false }),
  ];

  test("only visible input fields are checked", () => {
    assert.deepEqual(validateAnswers(fields, {}), { a: "This field is required." });
    assert.deepEqual(validateAnswers(fields, { a: "y" }), {});
    assert.deepEqual(validateAnswers(fields, { a: "x" }), { b: "This field is required." });
  });

  test("onlyIds narrows the check to one page", () => {
    assert.deepEqual(validateAnswers(fields, {}, new Set(["b"])), {});
  });

  test("a validator exception becomes a field error, never a throw", () => {
    const broken = [f("r", "repeater", { config: { subFields: [null] } })];
    assert.deepEqual(validateAnswers(broken, { r: [{}] }), { r: "This answer isn't valid." });
  });

  test("a hidden field may hold a value but never a structure", () => {
    const list = [f("h", "hidden")];
    assert.deepEqual(validateAnswers(list, { h: "campaign" }), {});
    assert.deepEqual(validateAnswers(list, { h: 7 }), {});
    assert.ok(validateAnswers(list, { h: { a: 1 } }).h);
    assert.ok(validateAnswers(list, { h: ["a"] }).h);
  });

  test("a hidden choice is neither validated nor required", () => {
    const list = [f("a"), f("s", "select", { required: true, options: ["A"], conditions: [when("a", "equals", "yes")] })];
    assert.deepEqual(validateAnswers(list, { a: "no", s: "stale" }), {});
    assert.ok(validateAnswers(list, { a: "yes", s: "stale" }).s);
  });
});

describe("formulas", () => {
  const fields = [f("a", "number"), f("b", "number", { title: "Second Value" }), f("c", "number", { title: "Third", label: "Third Label" })];
  const answers = { a: 6, b: 3, c: 2 };
  const cases = [
    ["1 + 2 * 3", 7],
    ["(1 + 2) * 3", 9],
    ["10 / 4", 2.5],
    ["10 % 3", 1],
    ["5 / 0", 0],
    ["-2 * 3", -6],
    ["{a} * {b}", 18],
    ["{A} + {second value}", 9],
    ["{Third Label} + {third}", 4],
    ["{missing} + 1", 1],
    ["2 × 3", 6],
    ["6 ÷ 3", 2],
    ["5 − 3", 2],
    ["{a} x {b}", 18],
    ["3 > 2", 1],
    ["3 < 2", 0],
    ["3 >= 3", 1],
    ["3 <= 2", 0],
    ["3 == 3", 1],
    ["3 = 3", 1],
    ["3 != 3", 0],
    ['"abc" == "ABC"', 1],
    ["1 && 0", 0],
    ["1 || 0", 1],
    ["!0", 1],
    ["TRUE + TRUE", 2],
    ["FALSE", 0],
    ["IF(1, 10, 20)", 10],
    ["IF(0, 10, 20)", 20],
    ["IF(0, 10)", 0],
    ["if({a} > 5, 1, 2)", 1],
    ["SUM(1, 2, 3)", 6],
    ["MIN(4, 2)", 2],
    ["MAX(4, 2)", 4],
    ["AVG(2, 4)", 3],
    ["ROUND(2.345, 1)", 2.3],
    ["ROUND(2.5)", 3],
    ["ABS(-3)", 3],
    ['DAYS("2026-01-10", "2026-01-01")', 9],
    ['LEN("abcd")', 4],
    ["1 / 3", 0.33],
  ];
  for (const [formula, expected] of cases) {
    test(`${formula} = ${expected}`, () => {
      assert.equal(evaluateFormula(formula, fields, answers), expected);
    });
  }

  for (const formula of ["", null, "1 +", "(1", "{a", '"open', "1 2", "NOPE(1)", "constructor(1)", "__proto__", "1 $ 2", "MIN()"]) {
    test(`${JSON.stringify(formula)} evaluates to null instead of throwing`, () => {
      assert.equal(evaluateFormula(formula, fields, answers), null);
    });
  }

  test("checkFormula reports a problem only for broken formulas", () => {
    assert.equal(checkFormula("1 + 1"), null);
    assert.equal(checkFormula(""), null);
    assert.match(checkFormula("NOPE(1)"), /Unknown function/);
    assert.match(checkFormula("(1"), /Expected/);
  });

  test("numericValue maps each answer type to a number", () => {
    const pts = { optionPoints: { A: 5, B: "", C: 0 } };
    assert.equal(numericValue(f("x", "checkbox"), true), 1);
    assert.equal(numericValue(f("x", "consent"), false), 0);
    assert.equal(numericValue(f("x", "select", pts), "A"), 5);
    assert.equal(numericValue(f("x", "select", pts), "C"), 0);
    assert.equal(numericValue(f("x", "dropdown", pts), "B"), 0, "a blank points value falls through to the option's text");
    assert.equal(numericValue(f("x", "select"), "7"), 7);
    assert.equal(numericValue(f("x", "multiselect", pts), ["A", "C", "Z"]), 5);
    assert.equal(numericValue(f("x", "multiselect", pts), "A"), 0);
    assert.equal(numericValue(f("x", "product", { config: { price: 2.5 } }), 3), 7.5);
    assert.equal(numericValue(f("x", "number"), "abc"), 0);
    assert.equal(numericValue(f("x", "date"), "1970-01-11"), 10);
    assert.equal(numericValue(f("x", "date"), ""), 0);
    assert.equal(numericValue(null, 5), 0);
  });

  test("option points read own, finite values only", () => {
    const field = f("x", "select", { options: ["A", "B", "C", "constructor"], optionPoints: { A: "2.5", B: "abc", C: null } });
    assert.equal(numericValue(field, "A"), 2.5);
    assert.equal(numericValue(field, "B"), 0, "non-numeric points fall through to the option's own text");
    assert.equal(numericValue(field, "C"), 0);
    assert.equal(numericValue(field, "constructor"), 0);
    assert.equal(numericValue(field, "__proto__"), 0);
    assert.equal(numericValue(field, ["A"]), 0);
    assert.equal(numericValue(f("x", "multiselect", { optionPoints: { A: 1 } }), ["toString", "A"]), 1);
  });

  test("an offered numeric option counts as its number; a value that isn't offered doesn't", () => {
    const field = f("x", "dropdown", { options: ["10", "20"] });
    assert.equal(numericValue(field, "20"), 20);
    assert.equal(numericValue(field, "1000"), 0);
  });

  test("a non-scalar or unparseable answer is never a number", () => {
    assert.equal(numericValue(f("x", "number"), ["5"]), 0);
    assert.equal(numericValue(f("x", "date"), "garbage"), 0);
  });

  test("formulas read choice points, product amounts and order totals", () => {
    const list = [
      f("s", "select", { optionPoints: { Hi: 10 } }),
      f("p", "product", { config: { price: 4 } }),
      f("tot", "total"),
    ];
    assert.equal(evaluateFormula("{s} + {p}", list, { s: "Hi", p: 2 }), 18);
    assert.equal(evaluateFormula("{tot}", list, { p: 3 }), 12);
  });

  test("formulas read dates as text so DAYS can diff them", () => {
    const list = [f("from", "date"), f("to", "date")];
    assert.equal(evaluateFormula("DAYS({to}, {from})", list, { from: "2026-03-01", to: "2026-03-11" }), 10);
    assert.equal(evaluateFormula("DAYS({to}, {from})", list, {}), 0);
  });

  test("calculated fields chain through each other", () => {
    const list = [f("n", "number"), f("c1", "calculated", { formula: "{n} + 1" }), f("c2", "calculated", { formula: "{c1} * 2" })];
    assert.equal(evaluateFormula("{c2}", list, { n: 2 }), 6);
    assert.deepEqual(withComputed(list, { n: 2 }), { n: 2, c1: 3, c2: 6 });
  });

  test("the cycle guard terminates self and mutual references with finite values", () => {
    const self = [f("a", "calculated", { formula: "{a} + 1" })];
    assert.equal(Number.isFinite(evaluateFormula("{a}", self, {})), true);
    const mutual = [f("a", "calculated", { formula: "{b} + 1" }), f("b", "calculated", { formula: "{c} + 1" }), f("c", "calculated", { formula: "{a} + 1" })];
    assert.equal(Number.isFinite(evaluateFormula(mutual[0].formula, mutual, {})), true);
    assert.equal(numericValue(mutual[1], undefined, mutual, {}), 3, "the walk stops when it returns to b, which then reads as 0: b = c + 1 = (a + 1) + 1 = (0 + 1 + 1) + 1");
  });
});

describe("gradeQuiz", () => {
  const form = (fields, quiz = {}) => ({ fieldDefs: fields, settings: { quiz: { enabled: true, ...quiz } } });

  test("no answer key means no grade", () => {
    assert.equal(gradeQuiz(form([f("a")]), { a: "x" }), null);
    assert.equal(gradeQuiz(form([f("a", "text", { correctAnswer: "" })]), { a: "x" }), null);
    assert.equal(gradeQuiz(form([f("a", "text", { correctAnswer: [] })]), { a: "x" }), null);
  });

  test("points add up and the percent decides the pass", () => {
    const fields = [f("a", "text", { correctAnswer: "Paris", config: { points: 3 } }), f("b", "text", { correctAnswer: "Rome" })];
    assert.deepEqual(gradeQuiz(form(fields), { a: " paris ", b: "Oslo" }), { earned: 3, possible: 4, percent: 75, passed: true, results: { a: true, b: false } });
  });

  test("the pass mark is inclusive and defaults to 70", () => {
    const fields = Array.from({ length: 10 }, (_, i) => f(`q${i}`, "text", { correctAnswer: "y" }));
    const seven = Object.fromEntries(fields.slice(0, 7).map((x) => [x.id, "y"]));
    assert.equal(gradeQuiz(form(fields), seven).passed, true);
    assert.equal(gradeQuiz(form(fields, { passMark: 71 }), seven).passed, false);
    assert.equal(gradeQuiz({ fieldDefs: fields, settings: {} }, seven).passed, true);
  });

  test("multi-answer keys need exactly the right set, in any order", () => {
    const fields = [f("a", "multiselect", { correctAnswer: ["x", "y"] })];
    assert.equal(gradeQuiz(form(fields), { a: ["y", "x"] }).earned, 1);
    assert.equal(gradeQuiz(form(fields), { a: ["x"] }).earned, 0);
    assert.equal(gradeQuiz(form(fields), { a: ["x", "y", "z"] }).earned, 0);
    assert.equal(gradeQuiz(form(fields), {}).earned, 0);
  });

  test("hidden questions aren't graded", () => {
    const fields = [f("a", "text", { correctAnswer: "y" }), f("b", "text", { correctAnswer: "y", conditions: [when("a", "equals", "n")] })];
    assert.deepEqual(gradeQuiz(form(fields), { a: "y", b: "y" }).results, { a: true });
  });

  test("an unanswered question is wrong, not skipped", () => {
    assert.deepEqual(gradeQuiz(form([f("a", "text", { correctAnswer: "y" })]), {}).results, { a: false });
  });
});

describe("scoreResponse", () => {
  const scored = (fields, settings = {}) => ({ fieldDefs: fields, settings: { scoringEnabled: true, ...settings } });
  const pick = f("s", "select", { optionPoints: { Hi: 80, Mid: 40, Low: 39, Frac: 79.99 } });

  test("without scoring or a quiz there is no score", () => {
    const out = scoreResponse({ fieldDefs: [pick], settings: {} }, { s: "Hi" });
    assert.deepEqual(out, { score: null, priority: "Low", quiz: null, outcome: null });
  });

  test("priority thresholds are inclusive with defaults of 80 and 40", () => {
    const priority = (s) => scoreResponse(scored([pick]), { s }).priority;
    assert.equal(priority("Hi"), "High");
    assert.equal(priority("Frac"), "Medium");
    assert.equal(priority("Mid"), "Medium");
    assert.equal(priority("Low"), "Low");
  });

  test("custom thresholds apply", () => {
    const settings = { highThreshold: 10, mediumThreshold: 5 };
    const list = [f("s", "select", { optionPoints: { A: 10, B: 5, C: 4 } })];
    assert.equal(scoreResponse(scored(list, settings), { s: "A" }).priority, "High");
    assert.equal(scoreResponse(scored(list, settings), { s: "B" }).priority, "Medium");
    assert.equal(scoreResponse(scored(list, settings), { s: "C" }).priority, "Low");
  });

  test("the score sums choices, multi-choices and calculated fields, rounded to cents", () => {
    const list = [
      f("s", "select", { optionPoints: { A: 1.111 } }),
      f("m", "multiselect", { optionPoints: { x: 2, y: 3 } }),
      f("c", "calculated", { formula: "10" }),
      f("skip", "calculated", { formula: "100", config: { countInScore: false } }),
      f("plain", "text"),
    ];
    assert.equal(scoreResponse(scored(list), { s: "A", m: ["x", "y"], plain: "ignored" }).score, 16.11);
  });

  test("hidden fields don't score", () => {
    const list = [
      f("gate"),
      f("s", "select", { optionPoints: { A: 50 }, conditions: [when("gate", "equals", "open")] }),
      f("c", "calculated", { formula: "50", conditions: [when("gate", "equals", "open")] }),
    ];
    assert.equal(scoreResponse(scored(list), { gate: "shut", s: "A" }).score, 0);
    assert.equal(scoreResponse(scored(list), { gate: "open", s: "A" }).score, 100);
  });

  test("quiz points count toward the score", () => {
    const list = [f("q", "text", { correctAnswer: "y", config: { points: 5 } }), pick];
    const out = scoreResponse(scored(list, { quiz: { enabled: true } }), { q: "y", s: "Mid" });
    assert.equal(out.score, 45);
    assert.equal(out.quiz.earned, 5);
    const quizOnly = scoreResponse({ fieldDefs: list, settings: { quiz: { enabled: true } } }, { q: "y", s: "Mid" });
    assert.equal(quizOnly.score, 5);
    assert.equal(quizOnly.priority, "Low");
  });

  test("blank or non-numeric thresholds keep their defaults", () => {
    const list = [f("s", "select", { optionPoints: { A: 50 } })];
    for (const value of ["", " ", null, undefined, "abc"]) {
      assert.equal(scoreResponse(scored(list, { highThreshold: value, mediumThreshold: value }), { s: "A" }).priority, "Medium");
    }
    assert.equal(scoreResponse(scored(list, { highThreshold: "50" }), { s: "A" }).priority, "High");
  });

  test("a matched branch's priority beats the thresholds", () => {
    const settings = { branchingEnabled: true, branches: [{ id: "b", name: "VIP", priority: "Medium", conditions: [when("s", "equals", "Hi")] }] };
    assert.equal(scoreResponse(scored([pick], settings), { s: "Hi" }).priority, "Medium");
    const unscored = scoreResponse({ fieldDefs: [pick], settings: { ...settings, scoringEnabled: false } }, { s: "Hi" });
    assert.equal(unscored.priority, "Medium");
  });

  test("a forged choice answer can't set its own score", () => {
    const out = scoreResponse(scored([f("s", "select", { options: ["A"], optionPoints: { A: 1 } })]), { s: "1000" });
    assert.equal(out.score, 0);
    assert.equal(out.priority, "Low");
  });

  test("an answer naming an Object.prototype key can't poison the score", () => {
    const out = scoreResponse(scored([f("s", "select", { options: ["A"], optionPoints: { A: 1 } })]), { s: "constructor" });
    assert.equal(out.score, 0);
  });

  test("a threshold of 0 is honoured instead of falling back to the default", () => {
    const list = [f("s", "select", { optionPoints: { A: 10 } })];
    assert.equal(scoreResponse(scored(list, { mediumThreshold: 0 }), { s: "A" }).priority, "Medium");
    assert.equal(scoreResponse(scored(list, { highThreshold: 0 }), { s: "A" }).priority, "High");
  });
});

describe("resolveOutcome", () => {
  const branch = (id, conditions, extra = {}) => ({ id, name: `Name ${id}`, conditions, ...extra });

  test("branching off means no outcome", () => {
    const settings = { branches: [branch("a", [when("x", "equals", "1")])] };
    assert.equal(resolveOutcome({ fieldDefs: [], settings }, { x: "1" }), null);
  });

  test("the first matching branch wins and legacy condition-less branches never match", () => {
    const settings = {
      branchingEnabled: true,
      branches: [{ id: "legacy", name: "Old" }, branch("empty", []), branch("a", [when("x", "equals", "1")], { outcome: "Winner" }), branch("b", [when("x", "equals", "1")])],
    };
    const out = resolveOutcome({ fieldDefs: [], settings }, { x: "1" });
    assert.equal(out.id, "a");
    assert.equal(out.outcome, "Winner");
    assert.equal(resolveOutcome({ fieldDefs: [], settings }, { x: "2" }), null);
  });

  test("the outcome falls back to the branch name", () => {
    const settings = { branchingEnabled: true, branches: [branch("a", [when("x", "equals", "1")])] };
    assert.equal(resolveOutcome({ fieldDefs: [], settings }, { x: "1" }).outcome, "Name a");
  });

  test("conditionLogic combines a branch's conditions", () => {
    const settings = { branchingEnabled: true, branches: [branch("a", [when("x", "equals", "1"), when("y", "equals", "1")], { conditionLogic: "all" })] };
    assert.equal(resolveOutcome({ fieldDefs: [], settings }, { x: "1" }), null);
    assert.equal(resolveOutcome({ fieldDefs: [], settings }, { x: "1", y: "1" }).id, "a");
  });

  test("branches can test calculated fields, the score and the quiz percent", () => {
    const fields = [
      f("q", "text", { correctAnswer: "y" }),
      f("s", "select", { optionPoints: { A: 50 } }),
      f("c", "calculated", { formula: "{s} * 2" }),
    ];
    const settings = {
      scoringEnabled: true,
      branchingEnabled: true,
      quiz: { enabled: true },
      branches: [branch("calc", [when("c", "gte", 1000)]), branch("score", [when("__score", "gte", 200)]), branch("quiz", [when("__quiz", "equals", 100)])],
    };
    assert.equal(scoreResponse({ fieldDefs: fields, settings }, { q: "y", s: "A" }).outcome.id, "quiz");
    const bigScore = { ...settings, branches: [settings.branches[1]] };
    assert.equal(scoreResponse({ fieldDefs: fields, settings: bigScore }, { q: "y", s: "A" }).outcome, null);
    const higher = { ...settings, branches: [branch("score", [when("__score", "gte", 151)])] };
    assert.equal(scoreResponse({ fieldDefs: fields, settings: higher }, { q: "y", s: "A" }).outcome.id, "score");
  });

  test("a score branch doesn't match when the form produces no score", () => {
    const settings = { branchingEnabled: true, branches: [branch("low", [when("__score", "lt", 50)])] };
    assert.equal(scoreResponse({ fieldDefs: [f("a")], settings }, { a: "x" }).outcome, null);
  });
});

describe("resolveEnding", () => {
  const form = (settings = {}, fieldDefs = [f("name"), f("site", "url")]) => ({
    fieldDefs,
    settings: { thankYouTitle: "Thanks", thankYouText: "Default text", thankYouType: "message", thankYouUrl: "", ...settings },
  });
  const outcome = (ending) => ({ branch: { id: "b", ending } });

  test("no outcome uses the default ending", () => {
    assert.deepEqual(resolveEnding(form(), {}), { custom: false, title: "Thanks", text: "Default text", button: null, redirectUrl: null });
  });

  test("a redirect ending needs the redirect type and a safe URL", () => {
    assert.equal(resolveEnding(form({ thankYouUrl: "https://x.test/done" }), {}).redirectUrl, null);
    assert.equal(resolveEnding(form({ thankYouType: "redirect", thankYouUrl: "https://x.test/done" }), {}).redirectUrl, "https://x.test/done");
    assert.equal(resolveEnding(form({ thankYouType: "redirect", thankYouUrl: "javascript:alert(1)" }), {}).redirectUrl, null);
  });

  test("an enabled per-outcome ending replaces the default, blank texts fall back", () => {
    const own = outcome({ enabled: true, title: "Custom", text: "  " });
    const out = resolveEnding(form(), {}, {}, own);
    assert.equal(out.custom, true);
    assert.equal(out.title, "Custom");
    assert.equal(out.text, "Default text");
  });

  test("a disabled per-outcome ending is ignored", () => {
    const out = resolveEnding(form(), {}, {}, outcome({ enabled: false, title: "Custom", redirectUrl: "https://x.test" }));
    assert.deepEqual(out, { custom: false, title: "Thanks", text: "Default text", button: null, redirectUrl: null });
  });

  test("an outcome ending doesn't inherit the default redirect", () => {
    const settings = { thankYouType: "redirect", thankYouUrl: "https://x.test/default" };
    assert.equal(resolveEnding(form(settings), {}, {}, outcome({ enabled: true })).redirectUrl, null);
    assert.equal(resolveEnding(form(settings), {}, {}, outcome({ enabled: true, redirectUrl: "https://x.test/own" })).redirectUrl, "https://x.test/own");
  });

  test("a button needs both a label and a safe URL", () => {
    const button = (label, url) => resolveEnding(form(), {}, {}, outcome({ enabled: true, buttonLabel: label, buttonUrl: url })).button;
    assert.deepEqual(button("Go", "https://x.test/"), { label: "Go", url: "https://x.test/" });
    assert.equal(button("  ", "https://x.test/"), null);
    assert.equal(button("Go", ""), null);
    assert.equal(button("Go", "javascript:alert(1)"), null);
    assert.equal(button("Go", "/relative"), null);
  });

  test("texts recall answers, URLs recall them percent-encoded", () => {
    const own = outcome({ enabled: true, title: "Hi {name}", redirectUrl: "https://x.test/?who={name}&score={score}" });
    const out = resolveEnding(form(), { name: "A&B C" }, { score: 7 }, own);
    assert.equal(out.title, "Hi A&B C");
    assert.equal(out.redirectUrl, "https://x.test/?who=A%26B%20C&score=7");
  });

  test("a recalled answer can't turn a template into a javascript: URL", () => {
    const own = outcome({ enabled: true, redirectUrl: "{site}" });
    assert.equal(resolveEnding(form(), { site: "javascript:alert(1)" }, {}, own).redirectUrl, null);
  });

  test("safeHttpUrl only passes absolute http(s)", () => {
    assert.equal(safeHttpUrl("https://x.test/a b"), "https://x.test/a%20b");
    assert.equal(safeHttpUrl(" http://x.test "), "http://x.test/");
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "/path", "", null, undefined, "x.test", "ftp://x.test"]) assert.equal(safeHttpUrl(bad), "");
  });
});

describe("interpolate", () => {
  const fields = [
    f("n1", "text", { title: "Full Name" }),
    f("multi", "multiselect", { title: "Colours" }),
    f("gate"),
    f("secret", "text", { title: "Secret", conditions: [when("gate", "equals", "open")] }),
    f("calc", "calculated", { title: "Double", formula: "{age} * 2" }),
    f("age", "number"),
    f("score", "text", { title: "Own Score" }),
  ];
  const form = { fieldDefs: fields };

  test("text without tags comes back untouched, empty becomes blank", () => {
    assert.equal(interpolate("Plain", form, {}), "Plain");
    assert.equal(interpolate("", form, {}), "");
    assert.equal(interpolate(null, form, {}), "");
  });

  test("tags resolve by title or id, any case, with spaces", () => {
    assert.equal(interpolate("{full name} / { FULL NAME } / {N1}", form, { n1: "Ada" }), "Ada / Ada / Ada");
  });

  test("answers recall through their display value", () => {
    assert.equal(interpolate("{Colours}", form, { multi: ["Red", "Blue"] }), "Red, Blue");
  });

  test("unknown tags are left as written", () => {
    assert.equal(interpolate("{nobody} {Full Name}", form, { n1: "Ada" }), "{nobody} Ada");
  });

  test("a logic-hidden field recalls as blank, even with a stale answer", () => {
    assert.equal(interpolate("[{Secret}]", form, { gate: "shut", secret: "leak" }), "[]");
    assert.equal(interpolate("[{Secret}]", form, { gate: "open", secret: "shown" }), "[shown]");
  });

  test("a logic-hidden calculated field recalls as blank, not its value", () => {
    const list = [f("gate"), f("c", "calculated", { title: "Sum", formula: "1 + 1", conditions: [when("gate", "equals", "open")] })];
    assert.equal(interpolate("[{Sum}]", { fieldDefs: list }, { gate: "shut" }), "[]");
    assert.equal(interpolate("[{Sum}]", { fieldDefs: list }, { gate: "open" }), "[2]");
  });

  test("calculated fields recall their computed value", () => {
    assert.equal(interpolate("{Double}", form, { age: 21 }), "42");
  });

  test("extras win over a field of the same id", () => {
    assert.equal(interpolate("{score}", form, { score: "typed" }, { score: 99 }), "99");
    assert.equal(interpolate("{outcome}|{total}", form, {}, { outcome: "", total: null }), "|");
  });

  test("encode applies to recalled values and extras, not the template", () => {
    assert.equal(interpolate("a b {Full Name} {total}", form, { n1: "x y" }, { total: "1 2" }, encodeURIComponent), "a b x%20y 1%202");
  });
});

describe("computeOrder", () => {
  const product = (id, price, extra = {}) => f(id, "product", { label: id.toUpperCase(), config: { price, ...extra.config }, ...extra });
  const form = (fields, payments = {}) => ({ fieldDefs: fields, settings: { payments } });

  test("totals visible products by quantity, flooring and dropping bad quantities", () => {
    const fields = [product("a", 2.5), product("b", 10), product("c", 1), product("free", 0)];
    const order = computeOrder(form(fields), { a: "2.9", b: -4, c: "x", free: 3 });
    assert.deepEqual(order.items, [{ fieldId: "a", name: "A", price: 2.5, quantity: 2, amount: 5 }]);
    assert.equal(order.total, 5);
    assert.equal(order.discount, 0);
    assert.equal(order.coupon, null);
  });

  test("hidden products aren't charged", () => {
    const fields = [f("g"), product("a", 5, { conditions: [when("g", "equals", "buy")] })];
    assert.equal(computeOrder(form(fields), { g: "no", a: 3 }).total, 0);
    assert.equal(computeOrder(form(fields), { g: "buy", a: 3 }).total, 15);
  });

  test("fixed-quantity products count once when ticked", () => {
    const fields = [product("a", 5, { config: { price: 5, quantityMode: "fixed" } })];
    assert.equal(computeOrder(form(fields), { a: true }).items[0].quantity, 1);
    assert.equal(computeOrder(form(fields), { a: 9 }).items[0].quantity, 1);
    assert.equal(computeOrder(form(fields), {}).total, 0);
  });

  test("amounts stay rounded to cents", () => {
    assert.equal(computeOrder(form([product("a", 0.1)]), { a: 3 }).total, 0.3);
  });

  test("percent and amount coupons discount, capped at the subtotal", () => {
    const fields = [product("a", 20)];
    const payments = {
      coupons: [
        { code: "TEN", type: "percent", value: 10 },
        { code: "FIVE", type: "amount", value: 5 },
        { code: "BIG", type: "amount", value: 500 },
        { code: "OFF", type: "percent", value: 50, active: false },
      ],
    };
    const total = (code) => computeOrder(form(fields, payments), { a: 1, __coupon: code }).total;
    assert.equal(total("TEN"), 18);
    assert.equal(total(" ten "), 18);
    assert.equal(total("FIVE"), 15);
    assert.equal(total("BIG"), 0);
    assert.equal(total("OFF"), 20);
    assert.equal(total("NOPE"), 20);
    const applied = computeOrder(form(fields, payments), { a: 1, __coupon: "ten" });
    assert.deepEqual(applied.coupon, { code: "TEN", type: "percent", value: 10 });
    assert.equal(applied.discount, 2);
  });

  test("currency, mode and interval default sensibly", () => {
    assert.deepEqual(
      (({ currency, mode, interval }) => ({ currency, mode, interval }))(computeOrder(form([]), {})),
      { currency: "usd", mode: "payment", interval: "month" },
    );
    const sub = computeOrder(form([], { currency: "EUR", mode: "subscription", interval: "year" }), {});
    assert.deepEqual([sub.currency, sub.mode, sub.interval], ["eur", "subscription", "year"]);
  });
});

describe("display and identity", () => {
  test("displayValue renders each answer type", () => {
    const cases = [
      [f("x", "text"), "", ""],
      [f("x", "text"), null, ""],
      [f("x", "checkbox"), true, "Yes"],
      [f("x", "checkbox"), false, "No"],
      [f("x", "consent"), true, "Agreed"],
      [f("x", "multiselect"), ["a", "b"], "a, b"],
      [f("x", "ranking"), ["a", "b"], "a, b"],
      [f("x", "name"), { first: "Ada", last: "Lovelace" }, "Ada Lovelace"],
      [f("x", "address"), { line1: "1 St", city: "Town", zip: "9" }, "1 St, Town, 9"],
      [f("x", "matrix"), { r: "c" }, "r: c"],
      [f("x", "file"), [{ name: "a.pdf" }, { name: "b.pdf" }], "a.pdf, b.pdf"],
      [f("x", "signature"), { path: "p" }, "Signed"],
      [f("x", "repeater"), [{}], "1 entry"],
      [f("x", "repeater"), [{}, {}], "2 entries"],
      [f("x", "product", { label: "Mug" }), 2, "2 × Mug"],
      [f("x", "rating"), 4, "4 / 5"],
      [f("x", "rating", { config: { max: 10 } }), 4, "4 / 10"],
      [f("x", "opinion"), 2, "2 / 5"],
      [f("x", "opinion", { config: { labels: ["Bad", "Good"] } }), 2, "Good · 2 / 5"],
      [f("x", "text"), { a: 1 }, '{"a":1}'],
      [f("x", "number"), 0, "0"],
    ];
    for (const [field, value, expected] of cases) assert.equal(displayValue(field, value), expected, `${field.type} ${JSON.stringify(value)}`);
  });

  test("detectRespondent prefers typed fields and falls back on titles", () => {
    assert.deepEqual(
      detectRespondent([f("n", "name"), f("e", "email"), f("t", "text", { title: "Other email" })], { n: { first: "A", last: "B" }, e: " a@b.co ", t: "c@d.co" }),
      { name: "A B", email: "a@b.co" },
    );
    assert.deepEqual(
      detectRespondent([f("t", "text", { title: "Work Email" }), f("u", "text", { title: "Your name" })], { t: "a@b.co", u: " Ada " }),
      { name: "Ada", email: "a@b.co" },
    );
    assert.deepEqual(detectRespondent([f("t", "text", { title: "Email" })], { t: "not an email" }), { name: null, email: null });
    assert.deepEqual(detectRespondent([f("e", "email", { included: false })], { e: "a@b.co" }), { name: null, email: null });
  });

  test("sensitiveIdentity flags the fields detectRespondent would read", () => {
    assert.deepEqual(sensitiveIdentity(undefined), { name: false, email: false });
    assert.deepEqual(sensitiveIdentity([f("e", "email"), f("n", "name")]), { name: false, email: false });
    assert.deepEqual(sensitiveIdentity([f("e", "email", { sensitive: true })]), { name: false, email: true });
    assert.deepEqual(sensitiveIdentity([f("t", "text", { title: "Work email", sensitive: true })]), { name: false, email: true });
    assert.deepEqual(sensitiveIdentity([f("n", "name", { sensitive: true })]), { name: true, email: false });
    assert.deepEqual(sensitiveIdentity([f("t", "text", { title: "Your name", sensitive: true })]), { name: true, email: false });
    assert.deepEqual(sensitiveIdentity([f("t", "text", { title: "SSN", sensitive: true })]), { name: false, email: false });
  });

  test("labelAnswers keys by label, skipping empties, layout and computed fields", () => {
    const fields = [
      f("a", "text", { label: "First" }),
      f("b", "text", { title: "Second" }),
      f("c"),
      f("h", "heading"),
      f("calc", "calculated"),
    ];
    assert.deepEqual(labelAnswers({ a: "1", b: "2", c: "", h: "x", calc: 3 }, fields), { First: "1", Second: "2" });
  });
});
