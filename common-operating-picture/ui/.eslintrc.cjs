module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'eol-last': ['error', 'always'],
    'object-curly-spacing': ['error', 'always'],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 
        'varsIgnorePattern': '^_.*$',  // Ignore variables prefixed with an underscore
        'argsIgnorePattern': '^_',    // Ignore function arguments prefixed with an underscore
      },
    ],
  },
}
