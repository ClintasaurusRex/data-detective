import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // Source bundled verbatim into the standalone Node reconciliation module.
    files: ["src/export/twoExportsRunner.js", "src/export/firstReportingToolRunner.js", "src/export/nodeFileIO.js"],
    languageOptions: { globals: { ...globals.node, fs: "readonly", constants: "readonly", resolve: "readonly", dirname: "readonly", join: "readonly", readJsonInput: "readonly", saveReport: "readonly", validateTwoExportsInput: "readonly", validateTwoExportsReport: "readonly", validateReportingInput: "readonly", validReportingPeriod: "readonly", validateWeeklyReport: "readonly", loadCheckedCode: "readonly" } },
  },
  {
    // Classic scripts inlined into sandbox.html.
    files: ["src/runner/sandbox/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, ...globals.worker } },
  },
  {
    files: ["build/**/*.js", "tests/**/*.js", "*.config.js", "scripts/**/*.{js,mjs}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
