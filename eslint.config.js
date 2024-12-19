import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import jestPlugin from 'eslint-plugin-jest';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
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
  },
  // GOTCHA: this block needs to be separated so it takes effect
  {
    ignores: ['dist/**/*', 'eslint.config.js', 'tf/**/*']
  }
];
