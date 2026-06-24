import { createContext } from 'react';

export type ResolvedScheme = 'light' | 'dark';

/** The effective color scheme after applying the user's theme preference. */
export const SchemeContext = createContext<ResolvedScheme | null>(null);
