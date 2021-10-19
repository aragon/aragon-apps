module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    commonjs: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['react'],
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    'react/no-typos': 1,
    semi: ['error', 'never'],
    'array-bracket-spacing': [
      'error',
      'always',
      {
        objectsInArrays: false,
        arraysInArrays: false,
        singleValue: false
      }
    ],
    'func-style': ["warn", "declaration", { "allowArrowFunctions": true }],
    'object-curly-spacing': ['error', 'always'],
    //"import/no-unused-modules": [
    //  "warn",
    //  {
    //    unusedExports: true,
    //    missingExports: true,
    //    ignoreExports: [],
    //  }
    //],
    "no-undef": "error",
    "no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    "react/jsx-uses-react": "warn",
    "react/jsx-uses-vars": "warn",
    "react/jsx-filename-extension": "off",
    "react/no-unused-prop-types": "warn",
    "sort-imports": ["warn", { "ignoreDeclarationSort": true }]
  },
  settings: {
    react: {
      version: 'detect',
    }
  }
}
