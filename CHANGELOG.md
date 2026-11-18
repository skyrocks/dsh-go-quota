# Changelog

## 0.1.10

- 补上插件图标与本地化名称：新增 `icon.svg`（`exports["./icon"]`）和 `locale/{zh,en}.json`
  （`meta.title` / `meta.description`）。此前设置页的插件列表只能回退成包名、也没有图标。
- 安装包不再包含 `test/`：运行时本来就不碰文件系统，但自动化商店的源码扫描会把包内测试里的
  `node:fs` 判成「插件会读写本机文件」的权限信号。仓库内的测试与 CI 不受影响。

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.9] - 2026-11-06

### Changed

- Renamed the package from `dsh-go-quota` to `@skyrocks/dsh-go-quota`, matching the
  other `@skyrocks/*` DSH plugins. The repository name stays `dsh-go-quota`.
- Updated the Typert manifest, client bundle id, Remote descriptors and bundle patch
  row to the scoped name; added a consistency test so they cannot drift again.
- README: tarball names now use `skyrocks-dsh-go-quota-0.1.9.tgz`; removed a duplicated
  install-source row left from the 0.1.8 docs update.

### Upgrade note

- Remove the old unscoped `dsh-go-quota` (0.1.7 / 0.1.8) first. Both versions insert
  the same plugin row id (`go-quota`), so keeping both installed will conflict.

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
