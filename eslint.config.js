import globals from 'globals';
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginPrettier from 'eslint-plugin-prettier';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extends('airbnb-base', 'plugin:prettier/recommended'),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: {
      pluginImport,
      pluginPrettier,
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      "import/extensions": ["error", "ignorePackages", {
        "js": "always",
        "jsx": "always",
        "ts": "never",
        "tsx": "never"
      }],
      "import/no-unresolved": ["error", "ignorePackages", {
        "js": "always",
        "jsx": "always",
        "ts": "never",
        "tsx": "never"
      }]
    },
  },
];
