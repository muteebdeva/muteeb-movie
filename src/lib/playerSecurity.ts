/**
 * Hardening for the third-party VidAPI embed iframe.
 *
 * Free streaming embeds are notorious for click-triggered ad popups and
 * full-page redirects. Those all originate *inside* the cross-origin iframe,
 * where our code cannot reach — but the iframe `sandbox` attribute lets us
 * deny the capabilities ads abuse, without touching playback:
 *
 * - `allow-scripts`      — the player itself is JS-driven; required.
 * - `allow-same-origin`  — the player needs its real origin (its own
 *                          cookies/storage/API), and our PLAYER_EVENT
 *                          validation requires origin https://vaplayer.ru.
 *                          (Safe: the frame is cross-origin to our site.)
 *
 * Deliberately NOT granted:
 * - `allow-popups`                         — kills ad popups / pop-unders.
 * - `allow-top-navigation[*-by-user-activation]` — kills full-page hijacks
 *   that redirect the whole site to an ad URL when the player is clicked.
 * - `allow-modals`                         — kills alert()/confirm() spam.
 *
 * What sandbox cannot stop: the iframe navigating *itself* (e.g. swapping
 * the video area for an in-player ad page). That stays visible inside the
 * player frame and never touches the rest of the site.
 */

export const IFRAME_SANDBOX = 'allow-scripts allow-same-origin';

/** Tokens that must never appear in the embed sandbox (ad-abuse surface). */
export const FORBIDDEN_SANDBOX_TOKENS = [
  'allow-popups',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-modals',
];
