// Type declarations for CSS imports used by the Expo web bundler (Metro).
// These are resolved at build time; this file teaches `tsc` about them so
// typechecking passes outside of Metro.

declare module '*.css' {
  const content: { readonly [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}
