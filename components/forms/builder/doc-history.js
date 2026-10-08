"use client";

import { useCallback, useReducer } from "react";

// One undo stack for the whole builder doc ({ title, description, fields, settings }).
const LIMIT = 100;
const COALESCE_MS = 900;

function init(doc) {
  return { past: [], present: doc, future: [], lastKey: null, lastAt: 0 };
}

function reducer(state, action) {
  switch (action.type) {
    case "set": {
      const next = typeof action.updater === "function" ? action.updater(state.present) : action.updater;
      if (next === state.present) return state;
      // Rapid edits to the same control (typing) collapse into one undo step.
      const coalesce = Boolean(action.key) && action.key === state.lastKey && action.at - state.lastAt < COALESCE_MS;
      return {
        past: coalesce ? state.past : [...state.past.slice(-(LIMIT - 1)), state.present],
        present: next,
        future: [],
        lastKey: action.key || null,
        lastAt: action.at,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
    default:
      return state;
  }
}

export function useDocHistory(initialDoc) {
  const [state, dispatch] = useReducer(reducer, initialDoc, init);

  // `key` groups consecutive edits of one control into a single undo step.
  const set = useCallback((updater, key) => dispatch({ type: "set", updater, key, at: Date.now() }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return {
    doc: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
