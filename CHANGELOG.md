# Changelog

## [0.2.0]

### Added
- A windowed overlay sized from the terminal, with vertical and horizontal scrolling and keyboard parity.
- Copy from the `c` key and the fullscreen `[ copy ]` click target; wheel scrolling in the overlay.
- Per-OS clipboard selection with an OSC 52 fallback.
- CSV and normalized Markdown table exports.
- Diff line classification and formatting fallback for JSON, YAML, and XML content.

### Fixed
- Windows clipboard Unicode handling by passing an ASCII base64 payload and decoding it as UTF-8 in PowerShell.

### Changed
- Added an esbuild build with a clean step and `prepack` pipeline.
- Pinned esbuild to `0.28.2` and restricted the package to the `dist`, `index.ts`, and `src` files.

## [0.1.0]

- Initial release exists in git history.
