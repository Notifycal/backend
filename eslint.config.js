import globals from 'globals';

import { fixupPluginRules } from '@eslint/compat';

import eslintJS from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from 'typescript-eslint';

// import tsPlugin from '@typescript-eslint/eslint-plugin';

import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import jestPlugin from 'eslint-plugin-jest';
import eslintConfigPrettier from 'eslint-config-prettier';

const patchedImportPlugin = fixupPluginRules(eslintPluginImport);

const lintableFiles = ['src/**/*.ts', 'src/**/*.js'];

const baseESLintConfig = {
  name: 'eslint',
  extends: [eslintJS.configs.recommended],
  files: lintableFiles,
  rules: {
    'no-await-in-loop': 'error',
    'no-constant-binary-expression': 'error',
    'no-duplicate-imports': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-promise-executor-return': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unreachable-loop': 'error',
    'no-unused-private-class-members': 'error',
    'no-use-before-define': 'error',
    'require-atomic-updates': 'error',
    camelcase: 'error'
  }
};

const typescriptConfig = {
  name: 'typescript',
  extends: [...typescriptEslint.configs.recommendedTypeChecked],
  files: lintableFiles,
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: { modules: true },
      ecmaVersion: '2020',
      project: './tsconfig.json'
    },
    globals: {
      ...globals.builtin,
      ...globals.browser,
      ...globals.es2025
    }
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'error'
  },
  plugins: {
    import: patchedImportPlugin
  },
  rules: {
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-confusing-void-expression': 'error',
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-useless-empty-export': 'error',
    '@typescript-eslint/prefer-enum-initializers': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    'no-return-await': 'off',
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false
        }
      }
    ]
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  }
};

const unicornConfig = {
  name: 'unicorn',
  plugins: {
    unicorn: eslintPluginUnicorn
  },
  files: lintableFiles,
  rules: {
    'unicorn/custom-error-definition': 'error',
    'unicorn/empty-brace-spaces': 'error',
    'unicorn/no-array-for-each': 'off',
    'unicorn/no-array-reduce': 'off',
    'unicorn/no-console-spaces': 'error',
    'unicorn/no-null': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/prevent-abbreviations': 'off'
  }
};

const jestConfig = {
  name: 'jest',
  plugins: {
    jest: jestPlugin,
  },
  files: ["**/*.test.ts", "**/*.spec.ts"],
  languageOptions: {
    globals: {
      ...jestPlugin.globals
    }
  },
  rules: {
    ...jestPlugin.configs.recommended.rules,
    // Mind, there is a jest plugin to fail any test not containing assertions. Jest Linting is not clever enough to beware the assertion is embeded in some function.
    'jest/expect-expect': [
      'error',
      {
        assertFunctionNames: ['expect', 'assert']
      }
    ],
    'no-use-before-define': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off'
  },
  settings: {
    jest: {
      version: 'detect'
    }
  }
};

const eslintConfig = typescriptEslint.config(
  baseESLintConfig,
  typescriptConfig,
  eslintConfigPrettier,
  unicornConfig,
  jestConfig,
  {
    ignores: ['dist/**/*', 'eslint.config.js', 'tf/**/*']
  }
);

export default eslintConfig;

