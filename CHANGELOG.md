# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.8] - 2026-11-06

### Changed

- npm 发布暂缓（账号 token 权限问题），安装说明改回 GitHub 唯一来源，去掉 npm 徽章。
- 版本号与 Release 对齐。

## [0.1.7] - 2026-11-06

### Added

- Published to npm as `dsh-go-quota`; README and CLI examples now recommend the
  registry install (`dsh plugin --profile desktop add dsh-go-quota`).
- npm badge and `publishConfig.access: public`.

### Changed

- `author` set to `skyrocks`; tarball examples bumped to 0.1.7.

## [0.1.6] - 2026-10-27

### Added

- Full open-source README (Chinese + English) with illustrations, architecture,
  troubleshooting, privacy notes and roadmap.
- CI workflow running tests on Ubuntu, macOS and Windows with Node 22 and 24.
- `CHANGELOG.md` and `.gitignore`.

### Changed

- Documented Windows installation (tarball or `file:` directory).
- Package metadata: keywords, test script, docs included in the tarball.

## [0.1.5] - 2026-10-27

### Added

- Windows installation notes.

## [0.1.4] - 2026-10-23

### Fixed

- Progress fills in the hover panel were invisible because the fill element was
  inline; `display: block` is now set.
- Added a CSS regression test for the fix.

## [0.1.3] - 2026-10-23

### Changed

- The dock entry now uses `order: 99` so it renders after the context-usage
  percentage instead of before it.

## [0.1.2] - 2026-10-23

### Changed

- Removed the `zod` runtime dependency; the Typert result codec now uses a
  built-in shape validator. Directory installs (`link:`) no longer miss packages.
- Documented absolute-path directory installs.

## [0.1.1] - 2026-10-23

### Changed

- Progress bar colors: green `#6bd586` below 80%, amber at ≥80%, red at ≥90%.
- Unused track is gray in both light and dark themes.
- Percentage text uses a readable secondary color below the amber threshold.

## [0.1.0] - 2026-10-23

### Added

- Initial release: OpenCode GO 5-hour / weekly / monthly quota in the composer
  dock, hover details with reset countdowns, click-to-refresh, and key resolution
  from the current DSH configuration only.
