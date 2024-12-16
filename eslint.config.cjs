const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const jestPlugin = require('eslint-plugin-jest');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      jest: jestPlugin,
      prettier: prettierPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.stylistic.rules,
      ...jestPlugin.configs.recommended.rules,
      ...prettierPlugin.configs.recommended.rules
    },
    settings: {
      jest: {
        version: 'detect'
      }
    }
  }, {
    ignores: ['dist/**/*', 'eslint.config.cjs', 'tf/**/*']
  }
];
