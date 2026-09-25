module.exports = {
  extends: ['airbnb-base', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  rules: {
    'prettier/prettier': 'error',
    'no-console': ['error', { allow: ['time', 'timeEnd'] }],
    'import/prefer-default-export': 'off',
    'no-return-await': 'off',
    'no-param-reassign': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
  },
};
