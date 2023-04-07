module.exports = {
  plugins: ['vitest', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:vitest/recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  rules: {
    eqeqeq: ['error', 'smart'],
    'prettier/prettier': [
      'warn',
      {
        endOfLine: 'auto',
      },
    ],
  },
};
