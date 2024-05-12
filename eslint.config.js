import globals from 'globals';
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import pluginPrettier from 'eslint-plugin-prettier';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.extends('airbnb-base', 'plugin:prettier/recommended'),
  {
    languageOptions: { globals: globals.node },
    plugins: {
      pluginImport,
      pluginPrettier,
    },
  },
];
