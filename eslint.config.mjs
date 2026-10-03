import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["**/dist/**", "Frontend Assignment 03/**"] },
  {
    files: ["client/src/**/*.{js,jsx}", "admin/src/**/*.{js,jsx}"],
    ...js.configs.recommended,
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
];
