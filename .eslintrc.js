module.exports = {
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    parser: 'babel-eslint',
  },
  rules: {
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'no-param-reassign': 'off',
    'func-names': 'off',
    'global-require': 'off',
    'consistent-return': 'off',
    'max-len': 'off'
  }
}
