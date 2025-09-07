import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
  },
  {
    ignores: [
      'node_modules',
      'coverage',
      'dist',
      'dev-dist',
      'public',
      '__mocks__',
      'src/theme',
      'tools',
      '*.d.ts',
      'postcss.config.js',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactX.configs['recommended-typescript'],
  reactDom.configs.recommended,
  eslintPluginPrettierRecommended,
  jsxA11yPlugin.flatConfigs.recommended,
  {
    rules: {
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Prevent direct imports from feature subdirectories
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@/features/*/*'],
        },
      ],
    },
  },
];
