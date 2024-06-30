// @ts-check
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginImport from 'eslint-plugin-import';
import pluginPrettier from 'eslint-plugin-prettier';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/'],
  },
  ...compat.extends('airbnb-base', 'plugin:prettier/recommended'),
  {
    languageOptions: { globals: globals.node, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: {
      pluginImport,
      pluginPrettier,
    },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
);
