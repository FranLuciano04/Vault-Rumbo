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
    // Los tests leen `tailwind.config.js` (CommonJS sin tipos) y mockean módulos con `require`.
    files: ["__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
