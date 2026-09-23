/**
 * URL for a file in /public that works under any deploy base path
 * (e.g. GitHub Pages serves the app from /<repo>/, not from the domain root).
 */
export function assetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file.replace(/^\//, '')}`;
}
