import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/decompiled/**',
      '**/facts/**',
      '**/assets/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false, // no project-wide type rules (keeps it light)
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Browser APIs
        IntersectionObserver: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        // IndexedDB
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBValidKey: 'readonly',
        // Service Worker globals
        self: 'readonly',
        importScripts: 'readonly',
        caches: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // AMD/UMD
        define: 'readonly',
        // Third-party library globals
        L: 'readonly', // Leaflet maps
        here: 'readonly', // HERE Maps SDK
        calculateRoute: 'readonly', // HERE Maps function
        setHere: 'readonly', // HERE Maps function
      },
    },
    plugins: { '@typescript-eslint': tsPlugin, 'unused-imports': unusedImports },
    rules: {
      ...js.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'off', // we use unused-imports instead
      'unused-imports/no-unused-imports': 'warn',
      'no-console': 'off',
    },
  },
];
