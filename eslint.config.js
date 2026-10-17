import tseslint from 'typescript-eslint';

const banned = (name) => ({
  selector: `MemberExpression[property.name='${name}']`,
  message: `${name} is not allowed. Use textContent (AC88).`,
});

export default tseslint.config(
  { ignores: ['dist/**', 'dist-e2e/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-restricted-syntax': [
        'error',
        banned('innerHTML'),
        banned('outerHTML'),
        banned('insertAdjacentHTML'),
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name=/^write(ln)?$/]",
          message: 'document.write is not allowed.',
        },
      ],
    },
  },
);
