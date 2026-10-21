import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import base from "../../eslint.config.base.js";

export default tseslint.config(
  ...base,
  { ignores: [".expo/**", "android/**", "ios/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
