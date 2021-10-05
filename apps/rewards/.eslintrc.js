module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    commonjs: true,
  },
  extends: [
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier/react',
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
    'object-curly-spacing': ['error', 'always'],
    //'import/no-unused-modules': [
    //  1,
    //  {
    //    unusedExports: true,
    //    missingExports: true,
    //    ignoreExports: [
    //      'app/index.js', // no exports
    //      'app/script.js', // no exports
    //      'app/components/Content/MyRewards.js', // used by index.js and App.js but not detected by linter
    //      'app/components/Content/Overview.js', // used by index.js and App.js but not detected by linter
    //      'app/components/Panel/index.js', // used by App.js but not detected by linter
    //      'app/components/Panel/MyReward/index.js', // used by PanelManager.js but not detected by linter
    //      'app/components/Panel/NewReward/index.js', // used by PanelManager.js but not detected by linter
    //      'app/components/Panel/ViewReward/index.js', // used by PanelManager.js but not detected by linter
    //    ],
    //  }
    //],
    'no-undef': 'error',
    'no-unused-vars': ['warn', { 'vars': 'all', 'args': 'after-used', 'ignoreRestSiblings': false }],
    'react/jsx-uses-react': 'warn',
    'react/jsx-uses-vars': 'warn',
    'react/no-unused-prop-types': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  }
}
