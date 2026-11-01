import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sandboxPagePlugin } from "./build/sandboxPage.js";

export default defineConfig({
  // Relative asset paths, so the built app works from any folder or sub-path.
  base: "./",
  plugins: [react(), sandboxPagePlugin()],
  test: {
    include: ["tests/unit/**/*.test.js"],
    environment: "node",
  },
});
