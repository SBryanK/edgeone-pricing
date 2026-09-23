// Optional password gate, configured at build time via VITE_APP_PASSWORD.
// When it is unset the gate is skipped entirely so a plain static deploy
// (e.g. GitHub Pages) works out of the box.
// NOTE: the value is baked into the public JS bundle, so this is a
// convenience gate, not a security boundary. For real auth, put the app
// behind SSO / an authenticating reverse proxy.
const PASSWORD: string = (import.meta.env.VITE_APP_PASSWORD as string | undefined) || '';

export function isLoginRequired(): boolean {
  return PASSWORD.length > 0;
}

export function checkPassword(input: string): boolean {
  return PASSWORD.length > 0 && input === PASSWORD;
}
