import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: [
      'dist',
      // esbuild output from the Functions build, not source.
      'functions/lib',
      'packages/*/dist',
      'packages/*/lib',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // The portal is plain JSX, not TypeScript. Prop shapes are documented with
    // JSDoc on each component, and `react/prop-types` is about runtime shape
    // validation — it cannot be satisfied by JSDoc, only by a hand-written
    // `propTypes` object per component (~120 of them here) that would then drift
    // from the same JSDoc. Two copies of the truth is worse than one, so the rule
    // is off for this tree only; the legacy tree keeps it on.
    files: ['src/mobility-media/**/*.{js,jsx}', 'src/mobility-player/**/*.{js,jsx}'],
    rules: {
      'react/prop-types': 'off',
    },
  },
  {
    // These two are ESM (the package is "type": "module") but still reach for
    // `require` and `__dirname` in their bodies, which the browser-globals block
    // above flags as undefined. Node globals are added here and `no-undef` is
    // disabled so the file parses; genuine problems in them (tailwind.config.js
    // has a duplicate `plugins` key) are still reported.
    files: ['tailwind.config.js', 'vite.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-undef': 'off',
    },
  },
]
