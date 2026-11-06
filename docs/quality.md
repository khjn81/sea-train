# Quality and verification

## Scope and outcome

- 23 distinct hypothesis/change/evaluation rounds were executed. Baseline and harness setup are not counted as improvements.
- The fixed 100-point rubric moved from 37 to 75. These are implementation-agent judgments supported by execution evidence, not independent human or market ratings.
- The original frozen desktop suite moved from 5/16 passing to 16/16. Six supplementary browser probes were added and compared against the relevant pre-change implementation.
- Final local development checks: 22/22 desktop and 22/22 mobile-emulation (round 23, before its final cadence correction) cases passed, without retries.
- Final production checks: 6/6 passed across isolated Chrome, actual emulated touch input, and WebKit contexts.
- A fresh temporary checkout installed from the lockfile, built, and passed unit/protocol/process checks. CI repeats the public checks in Linux.

The final score deliberately remains below 100. Actual-phone thermal/performance tests, human usability studies, and multi-server production operation are outside this release.

## Reproduce

```bash
npm ci
npx playwright install chromium webkit
npm run format:check
npm run verify
npm run check:clean
```

Historical development evaluations used isolated Google Chrome on macOS. Current public npm commands use pinned full Chromium on every platform. WebKit is a separately installed test engine. The 360px mobile suite and 390px touch-production suite are emulations, not physical-device claims. Camera/microphone input and personal browser profiles are not used.

## Experiment record

The exact rubric is in [quality/rubric.json](../quality/rubric.json); hypotheses, decisions and executed counts are in [quality/experiments.json](../quality/experiments.json).

| Round | Change | Decision | Rubric judgment |
| --- | --- | --- | --- |
| 1 | Use the existing local/system fallback font stack, preserving train geometry and colors. | keep | 41/100 |
| 2 | Centralize guarded browser preference reads and writes without changing persistence when storage is available. | keep | 43/100 |
| 3 | Use a finite 0..100 parser with a documented 45 percent default. | keep | 44/100 |
| 4 | Track the media query live and retain an in-memory explicit override even when storage is denied. | keep | 46/100 |
| 5 | Centralize closing, focus the opened menu, restore focus on Escape, and close on outside input. | keep | 47/100 |
| 6 | Save and restore sibling inert states, harden visible-focusable selection, and avoid stale restoration when no modal is open. | keep | 48/100 |
| 7 | Label and focus the canvas; add arrow/Enter/Escape controls and reject late asynchronous seating after cancellation. | keep | 51/100 |
| 8 | Show finding/together/solo states, react to browser connectivity, and ignore callbacks from superseded sockets. | keep | 55/100 |
| 9 | Guard concurrent toggles, clean up failed contexts, restore the control, and synchronize its accessible label. | keep | 56/100 |
| 10 | Isolate initialization so renderer failure can return normally; show a readable static fallback with deliberate retry. | keep | 59/100 |
| 11 | Abort owned event listeners, stop animation and reconnection, close scene audio/socket work, and show the retry screen. | keep | 60/100 |
| 12 | Use an original canvas-gradient texture immediately, then replace its image on success and retain it on failure. | keep | 60/100 |
| 13 | Launch both processes with explicit ports and signal cleanup; make the proxy follow REALTIME_PORT. | keep | 61/100 |
| 14 | Add an explicit static build server, correct MIME/HEAD/cache semantics, a separate health endpoint, path validation, and loopback default. | keep | 65/100 |
| 15 | Validate browser origins against the received host or an explicit additional-origin list; retain origin-less protocol clients. | keep | 66/100 |
| 16 | Bound capacity, terminate missing-pong sessions, and clean up the owned server on termination signals. | keep | 67/100 |
| 17 | Coalesce room state within 16 ms, serialize once per broadcast, cap application messages and outgoing buffered bytes. | keep | 67/100 |
| 18 | Pause drawing and active scene time while hidden, suspend audio without auto-resume, defer environment updates, and guard asynchronous audio feedback after teardown. | keep | 68/100 |
| 19 | Collect and dispose unique passenger geometry/materials/textures exactly once, including on graphics teardown. | keep | 68/100 |
| 20 | Pin tested package versions, format application/server code, add license/assets guidance, CI, clean-checkout validation and public evidence documents. | keep | 75/100 |
| 21 | Exclude engine-owned Sprite geometry from passenger-owned disposal; retain unique material and texture cleanup. | keep | 75/100 |
| 22 | Allocate a bounded 3:1 canvas once and draw the loaded image into that same backing before updating the texture. | keep | 75/100 |

| 23 | Bound software-renderer resolution, omit dynamic shadows and cube reflections, and limit drawing to 15 Hz. | keep locally; remote verification pending | 75/100 |

## Failures retained in the record

- Round 11 initially passed a short check. A delayed timer probe then found an exception against removed UI. Timer and pending-seat cleanup were corrected and the same round was rerun.
- Round 12 retained a useful missing-image fallback, but release screenshot review later exposed a normal-image GPU upload regression. Round 22 preserved immutable texture dimensions and restored the actual panorama.
- Round 21 added a counterexample for shared Three.js Sprite geometry. Passenger cleanup now preserves that shared geometry while releasing owned materials, textures and mesh buffers.

Supplementary probes explicitly inject storage denial, missing images, unavailable graphics/audio, visibility changes and graphics loss. Browser graphics-buffer deletion is observed; no RAM/VRAM quantity or real-phone battery saving is claimed.

## Public artifact boundaries

The repository contains application source, generated project imagery, tests, and this sanitized summary. Local reference-site snapshots, private research notes, raw traces and local-run state are excluded. Package and asset attribution is in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## CI instrumentation experiment

The first Linux run completed installation, formatting, build, and unit checks, then timed out during browser checks. Its traces repeatedly reported GPU readback stalls. A separate CI run disables continuous trace capture while retaining the same browser cases, assertions, retry counts, timeouts, explicit application screenshots, and JSON reports. The outcome is reported separately; this does not change the scored local evaluator or add to the application-improvement count.

The trace-only hypothesis did not resolve the failure. A local A/B reproduction with the same Playwright Chromium version reproduced the headless-shell timeout and passed the same journey using the full Chromium channel. Public npm commands therefore select `browser.config.js` and `release-browser.config.js`, which preserve the same tests, projects, assertions, timeouts and retry counts while using the full Chromium implementation. The original sealed evaluator files and historical Mac judgments remain unchanged. See [Playwright browser modes](https://playwright.dev/docs/browsers#chromium-new-headless-mode).

The third Linux run also timed out with full Chromium. Round 23 addresses the application cost on software renderers directly. Detection remains local; no renderer identity is transmitted or stored. Hardware-accelerated users retain the normal profile. A supplementary probe failed its backing-width bound before the change and passes afterward; all original assertions remain unchanged.

The fourth Linux run improved to 10 passing cases but exposed slow walking under the reduced cadence and exhausted the shared suite budget. The same round was corrected to preserve elapsed walking time and reduce software pixels further. CI now runs the unchanged desktop, mobile, and production projects as separate jobs; case/action timeouts and zero retries remain unchanged. The original 180-second combined local evaluator remains sealed.
