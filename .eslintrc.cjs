module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/stylistic',
    'plugin:jest/recommended',
    'plugin:prettier/recommended' // This should be the last
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    node: true
  },
  ignorePatterns: ['dist/**', '.eslintrc.cjs', 'tf/**']
};
