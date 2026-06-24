// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*', '/server/*'],
  rules: {
    // ── Import order is handled by the developer; no need for enforcement ─────
    'import/order': 'off',

    // ── React Compiler experimental rules (react-hooks v7) ───────────────────
    // The rules below are from the experimental React Compiler bundled in
    // eslint-plugin-react-hooks v7. They are too strict for common valid React
    // patterns used throughout this codebase (e.g. setState in a useEffect for
    // hydration, Date.now() in useMemo for "current time" calculations, etc.).
    // The fundamental rules (rules-of-hooks, exhaustive-deps, refs) are kept.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/static-components': 'off',
    'react-hooks/use-memo': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/config': 'off',
    'react-hooks/gating': 'off',
  },
};
