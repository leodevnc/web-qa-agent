# UI design notes

## Direction

The interface takes inspiration from OpenAI's restrained visual language rather than reproducing a branded screen. It uses the project's own name and mark. The foundation is a white canvas, a quiet neutral sidebar, system typography, fine borders, and generous spacing. Color is reserved mainly for verdict labels; the label text carries the meaning independently of color.

No external fonts, image services, analytics, or client-side scripts are required. Generated pages remain standalone HTML artifacts with an explicit content security policy.

## Information hierarchy

- **Overview:** scenario totals, actual passed/failed counts, per-run outcomes, and links to reports.
- **Report:** overall verdict and planner mode, independent assertions, findings, reproduction steps, then evidence.
- **Checks:** expected and observed values are visible without opening JSON. Native disclosure controls preserve access to the complete contract.
- **Steps:** semantic action descriptions are readable on narrow screens. Raw action details remain available.
- **Missing data:** incomplete runs and unavailable screenshots are shown explicitly, without decorative success states.

The expected-outcome match is separate from QA success: three deliberately broken fixtures remain failed even when the demo itself completes successfully. Blocked and incomplete runs retain their own labels rather than being counted as failed.

## Shared implementation

`src/ui.mjs` contains the theme and static page shell used by the suite overview and reports. The fixture imports the same foundation with storefront-specific layout rules. Its intentionally overflowing panel remains intentionally broken so the layout regression test stays meaningful.

The desktop sidebar becomes wrapped section navigation on small screens. A skip link, visible keyboard focus, native links, and native disclosure controls avoid adding a JavaScript interaction dependency. Generated reports are completed artifacts, not a live dashboard, so no loading controls or simulated live activity are shown.

## Verification

- Real Chromium checks at widths 320, 390, 768, and 1440 pixels.
- No horizontal document overflow on the overview and report.
- Keyboard skip link and focus outline, section anchors, and run-to-report navigation.
- Expandable check contracts and action details.
- Honest counts and explicit incomplete/missing-evidence states.
- Existing HTML escaping and all execution-policy tests remain in place.
- Desktop overview/report and mobile report screenshots inspected manually.

The tests do not claim a full accessibility audit or automatic pixel-diff coverage. Long arbitrary content, unusual assistive technologies and browser-specific rendering remain areas for further testing.
