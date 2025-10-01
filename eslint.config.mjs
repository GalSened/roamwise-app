import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  { ignores: ["**/node_modules/**","**/dist/**","**/build/**","**/.next/**","**/coverage/**","**/decompiled/**","**/facts/**"] },
  {
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false, // no project-wide type rules (keeps it light)
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: { "@typescript-eslint": tsPlugin, "unused-imports": unusedImports },
    rules: {
      ...js.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",    // we use unused-imports instead
      "unused-imports/no-unused-imports": "warn",
      "no-console": "off"
    }
  }
];
