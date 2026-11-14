# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Core Infrastructure Dependencies**:
  - Bumped `astro` from `7.0.3` to `7.4.12`.
  - Bumped `@astrojs/starlight` from `0.41.1` to `0.43.1`.
  - Bumped `@tailwindcss/vite` from `^4.3.1` to `^4.3.5`.
  - Bumped `tailwindcss` from `^4.3.1` to `^4.3.5`.
  - Bumped `@astrojs/check` from `0.9.9` to `0.9.12`.
- **Modernized JSON Imports**:
  - Removed deprecated `assert { type: "json" }` import assertions in `Header.astro` and `SiteTitle.astro` in favor of standard ES imports compatible with TypeScript 6 and Astro 7.

### Added
- **Peer and Parser Dependencies**:
  - Added `@astrojs/markdown-remark` (`^7.3.8`) to satisfy Starlight 0.43.1 peer dependency requirements during static build.
  - Added `acorn` (`^8.19.0`) and `estree-walker` (`^3.0.3`) to `devDependencies` to support `astro-vtbot` AST transformation under isolated node_modules package managers.
  - Added `pnpm-workspace.yaml` configuring approved build scripts for pnpm v12.

### Fixed
- **Starlight Component Overrides**:
  - `SidebarSublist.astro`: Replaced fragile unexported import from `node_modules/@astrojs/starlight/utils/navigation` with a self-contained recursive active-entry check (`hasCurrent`) so sidebar active state resolution works reliably across all build environments.
  - `TableOfContents/starlight-toc.ts`: Replaced fragile import from `node_modules/@astrojs/starlight/constants` with local constant `PAGE_TITLE_ID = "_top"`, fixing module resolution failures caused by Starlight 0.43 compiling internals to `dist/`.
