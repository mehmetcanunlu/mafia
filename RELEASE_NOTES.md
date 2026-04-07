# Release Notes

## 2026-04-07 - Usability and Combat Flow Improvements

- Added keyboard confirmation support in modals: `Enter` confirms, `Shift+Enter` confirms with bulk (`x5`) where supported.
- Improved confirm modal with optional third action button support used as `Miktar Gir`.
- Added bulk purchase flow for units and vehicles:
  - Normal confirm buys `1`
  - `Shift + Onay` buys `5`
  - `Miktar Gir` allows custom quantity input
- Fixed research tree horizontal scroll reset issue by preserving per-branch `scrollLeft` and page `scrollTop` during rerenders.
- Updated quick attack flow to auto-select the best source region (shortest route, then highest available stack) instead of manual source ID entry.
