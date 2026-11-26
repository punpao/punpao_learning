import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Set BEFORE any test file loads, so src/logger.ts reads "silent"
    // when it is first imported. No JSON log lines in the test output.
    env: { LOG_LEVEL: "silent" },
  },
});
