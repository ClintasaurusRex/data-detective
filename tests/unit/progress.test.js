import { describe, expect, it } from "vitest";
import { allExercises, playableCases } from "../../src/missions/index.js";
import { BACKUP_KEY, STORAGE_KEY, loadState, saveState } from "../../src/storage/progress.js";

const catalogue = { cases: playableCases, exercises: allExercises };

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
}

describe("saved progress", () => {
  it("starts fresh with no saved data", () => {
    const { state, notice } = loadState(catalogue, memoryStorage());
    expect(notice).toBeNull();
    expect(state.exercises["missing-jobs"]).toEqual({
      draft: null,
      previousDraft: null,
      hintsShown: 0,
      solutionRevealed: false,
      solved: null,
    });
    expect(state.cases["missing-jobs"]).toEqual({ prediction: null });
  });

  it("round-trips a saved state", () => {
    const storage = memoryStorage();
    const { state } = loadState(catalogue, storage);
    state.cases["missing-jobs"].prediction = { value: 3 };
    state.exercises["missing-jobs"] = {
      draft: "function transform(rows) { return rows; }",
      previousDraft: null,
      hintsShown: 2,
      solutionRevealed: false,
      solved: { code: "x", solvedAt: "2026-11-01T12:00:00.000Z", hintsUsed: 2, solutionRevealed: false },
    };
    expect(saveState(state, storage)).toBe(true);
    expect(loadState(catalogue, storage).state).toEqual(state);
  });

  it("recovers from malformed JSON and keeps a backup", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
    const { state, notice } = loadState(catalogue, storage);
    expect(notice).toMatch(/couldn't be read/);
    expect(state.exercises["missing-jobs"].draft).toBeNull();
    expect(storage.data.get(BACKUP_KEY)).toBe("{not json");
  });

  it("recovers from an unknown format", () => {
    for (const raw of ["null", "[]", '"text"', '{"version":99}']) {
      const { state, notice } = loadState(catalogue, memoryStorage({ [STORAGE_KEY]: raw }));
      expect(notice, raw).toMatch(/couldn't be read/);
      expect(state.exercises["missing-jobs"].hintsShown).toBe(0);
    }
  });

  it("cleans individual fields of the wrong type", () => {
    const raw = JSON.stringify({
      version: 1,
      cases: { "missing-jobs": { prediction: { value: "three" } } },
      exercises: {
        "missing-jobs": {
          draft: 42,
          previousDraft: ["x"],
          hintsShown: 99,
          solutionRevealed: "yes",
          solved: { code: null, solvedAt: "never" },
        },
        "missing-jobs-open": { draft: "function transform(r) { return r; }", hintsShown: -4, solved: "true" },
        "unknown-exercise": { draft: "x" },
      },
    });
    const { state, notice } = loadState(catalogue, memoryStorage({ [STORAGE_KEY]: raw }));
    expect(notice).toBeNull();
    expect(state.cases["missing-jobs"].prediction).toBeNull();
    expect(state.exercises["missing-jobs"]).toEqual({
      draft: null,
      previousDraft: null,
      hintsShown: 3,
      solutionRevealed: false,
      solved: null,
    });
    expect(state.exercises["missing-jobs-open"].draft).toBe("function transform(r) { return r; }");
    expect(state.exercises["missing-jobs-open"].hintsShown).toBe(0);
    expect(state.exercises["unknown-exercise"]).toBeUndefined();
  });

  it("works without storage", () => {
    const { state, notice } = loadState(catalogue, null);
    expect(notice).toMatch(/isn't letting the app save/);
    expect(state.exercises["missing-jobs"]).toBeDefined();
    expect(saveState(state, null)).toBe(false);
  });

  it("survives storage that throws", () => {
    const throwing = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    const loaded = loadState(catalogue, throwing);
    expect(loaded.notice).toMatch(/couldn't be accessed/);
    expect(loaded.storage).toBeNull();
    expect(saveState({}, throwing)).toBe(false);
  });

  it("leaves unreadable progress untouched when its backup cannot be saved", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{bad json" });
    storage.setItem = () => { throw new Error("quota"); };
    const loaded = loadState(catalogue, storage);
    expect(loaded.notice).toContain("couldn't be read or backed up");
    expect(loaded.notice).not.toContain("copy of the old data was kept");
    expect(loaded.storage).toBeNull();
    expect(saveState(loaded.state, loaded.storage)).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe("{bad json");
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("retains long drafts and restore copies without accepting oversized checked code", () => {
    const code = "//" + "x".repeat(50000);
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, exercises: {
      "missing-jobs": { draft: code, previousDraft: code, solved: { code } },
    } }) });
    const loaded = loadState(catalogue, storage);
    expect(loaded.state.exercises["missing-jobs"].draft).toBe(code);
    expect(loaded.state.exercises["missing-jobs"].previousDraft).toBe(code);
    expect(loaded.state.exercises["missing-jobs"].solved).toBeNull();
  });
});
