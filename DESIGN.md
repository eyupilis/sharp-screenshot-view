# Design system

ResolveIQ uses an enterprise operations-command-center language: dense but calm neutral surfaces, a dark slate sidebar and GTech-inspired amber for emphasis. Raw color values stay in `src/styles.css`; components consume semantic tokens.

## Tokens and hierarchy

- `brand`: primary emphasis; never the only status signal.
- `sev-p1..p4`: severity badges with text labels.
- `success`, `warning`, `info`, `destructive`: semantic feedback.
- 4–10 px radii, compact 13–14 px UI typography, tabular numerals for metrics.
- Page header → KPI cards → operational panels → secondary metadata.

## Accessibility

Keyboard focus is visible, reduced motion is respected, icons are paired with text/ARIA labels, statuses never rely only on color and the mobile navigation is horizontally scrollable. `/design-system` exposes regression examples.
