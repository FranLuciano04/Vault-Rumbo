import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Base compartida de las apps del workspace; cada app suma sus reglas propias (React, etc.).
export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
