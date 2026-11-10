// Saves drafts, predictions, hint use and progress in this browser only.
//
// Everything read back is validated field by field. If saved data can't be
// read, the app starts fresh and keeps a copy of the unreadable text under
// BACKUP_KEY, so nothing is silently thrown away.

export const STORAGE_KEY = "data-detective:v1";
export const BACKUP_KEY = "data-detective:v1:unreadable";
const MAX_CODE_CHARS = 50000;

export function emptyExerciseState() {
  return {
    draft: null, // null means "the starter code"
    previousDraft: null, // kept when the starter or the solution replaces a draft
    hintsShown: 0,
    solutionRevealed: false,
    solved: null, // { code, solvedAt, hintsUsed, solutionRevealed }
  };
}

export function emptyState() {
  return { version: 1, cases: {}, exercises: {} };
}

function cleanCode(value) {
  return typeof value === "string" && value.length <= MAX_CODE_CHARS ? value : null;
}

function cleanSolved(value, hintCount) {
  if (!value || typeof value !== "object") return null;
  const code = cleanCode(value.code);
  if (code === null) return null;
  const solvedAt = typeof value.solvedAt === "string" && !Number.isNaN(Date.parse(value.solvedAt)) ? value.solvedAt : null;
  return {
    code,
    solvedAt,
    hintsUsed: clampInt(value.hintsUsed, 0, hintCount),
    solutionRevealed: value.solutionRevealed === true,
  };
}

function clampInt(value, min, max) {
  return Number.isInteger(value) ? Math.min(Math.max(value, min), max) : min;
}

function cleanExercise(value, exercise) {
  const clean = emptyExerciseState();
  if (!value || typeof value !== "object") return clean;
  clean.draft = cleanCode(value.draft);
  clean.previousDraft = cleanCode(value.previousDraft);
  clean.hintsShown = clampInt(value.hintsShown, 0, exercise.hints.length);
  clean.solutionRevealed = value.solutionRevealed === true;
  clean.solved = cleanSolved(value.solved, exercise.hints.length);
  // Optional additive field: old Case 1 saves keep their original shape.
  const checked = value.checked;
  if (checked && cleanCode(checked.code) !== null && typeof checked.passed === "boolean") {
    clean.checked = { code: checked.code, passed: checked.passed };
  }
  return clean;
}

function cleanCase(value, caseDef) {
  const clean = { prediction: null };
  if (!value || typeof value !== "object") return clean;
  const p = value.prediction;
  if (p && typeof p === "object") {
    if (p.skipped === true) clean.prediction = { skipped: true };
    else if (caseDef.id === "messy-export" && [p.accepted, p.rejected].every((n) => Number.isInteger(n) && n >= 0 && n <= 1000)) {
      clean.prediction = { accepted: p.accepted, rejected: p.rejected };
    }
    else if (caseDef.id !== "messy-export" && Number.isInteger(p.value) && p.value >= 0 && p.value <= 1000) clean.prediction = { value: p.value };
  }
  return clean;
}

// Validate parsed data against the known cases and exercises.
export function sanitiseState(data, { cases, exercises }) {
  const state = emptyState();
  const valid = data && typeof data === "object" && data.version === 1;
  for (const c of cases) state.cases[c.id] = cleanCase(valid ? data.cases?.[c.id] : null, c);
  for (const e of exercises) state.exercises[e.id] = cleanExercise(valid ? data.exercises?.[e.id] : null, e);
  return state;
}

function safeStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = "data-detective:probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

// Returns { state, notice, storage }. `notice` is text to show the learner,
// or null when everything loaded normally.
export function loadState(catalogue, storage = safeStorage()) {
  const fresh = sanitiseState(null, catalogue);
  if (!storage) {
    return {
      state: fresh,
      storage: null,
      notice: "This browser isn't letting the app save, so your work will only last until you close the page.",
    };
  }
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === null) return { state: fresh, storage, notice: null };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) throw new Error("unknown format");
    return { state: sanitiseState(parsed, catalogue), storage, notice: null };
  } catch {
    try {
      storage.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more we can do; carry on with a fresh start.
    }
    return {
      state: fresh,
      storage,
      notice: `Your saved progress couldn't be read, so the app started fresh. A copy of the old data was kept in this browser's storage under "${BACKUP_KEY}".`,
    };
  }
}

export function saveState(state, storage) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
