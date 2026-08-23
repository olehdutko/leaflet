module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // Загальні правила
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    
    // TypeScript правила
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    
    // Структура файлів
    'import/no-default-export': 'off',
    'import/prefer-default-export': 'off',
    
    // Коментарі
    'spaced-comment': ['error', 'always'],
    
    // Форматування
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    
    // Специфічні правила для index.js
    'no-restricted-globals': [
      'error',
      {
        name: 'index',
        message: 'index.js повинен містити тільки імпорти та мінімальну ініціалізацію',
      },
    ],
  },
  overrides: [
    {
      // Спеціальні правила для index.ts
      files: ['index.ts', 'index.js'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'FunctionDeclaration',
            message: 'index.js повинен містити тільки імпорти',
          },
          {
            selector: 'VariableDeclaration',
            message: 'index.js повинен містити тільки імпорти',
          },
          {
            selector: 'ExpressionStatement:not(ImportDeclaration)',
            message: 'index.js повинен містити тільки імпорти',
          },
        ],
      },
    },
  ],
}; 