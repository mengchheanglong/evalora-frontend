import tseslint from "typescript-eslint";

export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**"],
  },
  ...tseslint.configs.recommended,
];
