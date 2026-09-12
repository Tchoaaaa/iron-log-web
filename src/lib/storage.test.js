import { describe, it, expect, vi, beforeEach } from "vitest";
import { readJSON, writeJSON, debounce } from "./storage";

const KEY = "test:key";

// Vitest's "node" environment has no Storage global — stub a minimal
// in-memory one so storage.js's calls to `localStorage` resolve.
function makeMemoryStorage() {
  let store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => (store = new Map()),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeMemoryStorage());
});

describe("readJSON / writeJSON", () => {
  it("round-trips a value", () => {
    writeJSON(KEY, { a: 1 });
    expect(readJSON(KEY)).toEqual({ a: 1 });
  });
  it("returns null for a missing key", () => {
    expect(readJSON("missing:key")).toBeNull();
  });
  it("returns null for malformed JSON instead of throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(() => readJSON(KEY)).not.toThrow();
    expect(readJSON(KEY)).toBeNull();
  });
  it("removes the key when writing null", () => {
    writeJSON(KEY, { a: 1 });
    writeJSON(KEY, null);
    expect(readJSON(KEY)).toBeNull();
  });
});

describe("debounce", () => {
  it("coalesces rapid calls into a single invocation", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    debounced(2);
    debounced(3);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
