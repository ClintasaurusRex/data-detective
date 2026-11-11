// Keep the established array-only runner and its security/lifecycle unchanged.
// The learner's scope can use any helper names, including transform. The prefix
// shares the first source line, keeping learner error line numbers unchanged.
// Copy to IDE calls reconcile directly and never includes this adapter.
export function reconciliationCode(code) {
  return 'function transform(rows) { return (function() {' + code + '\n;return reconcile;\n})()(rows[0], rows[1]); }\n';
}
