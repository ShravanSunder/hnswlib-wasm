module.exports = {
  plugins: ["vitest", "@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:vitest/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  root: true,
};
