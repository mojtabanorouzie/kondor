// Minimal react-native stub for node-side tests. Only the bits our pure
// services touch (Platform) are implemented.
export const Platform = {
  OS: 'node' as const,
  select: <T,>(specifics: { default?: T; native?: T; node?: T }): T | undefined =>
    specifics.default ?? specifics.native ?? specifics.node,
};
