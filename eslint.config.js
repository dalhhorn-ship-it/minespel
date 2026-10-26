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
  {
    files: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        banned('innerHTML'),
        banned('outerHTML'),
        banned('insertAdjacentHTML'),
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name=/^write(ln)?$/]",
          message: 'document.write is not allowed.',
        },
        {
          selector:
            "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
          message:
            'No fixed sleeps in tests (they flake on a slow machine). Use vi.waitFor, fake timers, or await the real event or promise.',
        },
      ],
    },
  },
  {
    // R2e: the UI review waits on the screen, the element or the animations, never on a timer.
    files: ['tests/e2e/ui-review*.spec.ts', 'tests/e2e/helpers/ui-audit.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          property: 'waitForTimeout',
          message: 'No fixed sleeps in the UI review. Wait for the screen hook, the element, or document.getAnimations() to finish (waitSettled in helpers/ui-audit.ts).',
        },
      ],
    },
  },
);
