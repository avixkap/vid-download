# Contributing to VidDownload

Thanks for your interest in improving VidDownload. This guide covers how to set up the project, what to check before opening a pull request, and how changes get merged.

## Ways to help

- **Report a bug**: open an issue using the bug report template. Include the site, the exact error text, and your Windows version.
- **Suggest a feature**: open an issue using the feature request template and describe the problem it solves.
- **Send a pull request**: for anything larger than a small fix, open an issue first so we can agree on the approach before you spend time on it.

Note that most "this site doesn't work" problems come from [yt-dlp](https://github.com/yt-dlp/yt-dlp) itself. Try **Settings, Re-check / update** first, and report site-specific extraction bugs to yt-dlp.

## Development setup

1. Install the [Tauri prerequisites](https://tauri.app/start/prerequisites/): Node.js 22+, Rust stable, and the Microsoft C++ Build Tools.
2. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/avixkap/vid-download.git
   cd vid-download
   npm install
   ```

3. Start the app with hot reload:

   ```bash
   npm run dev
   ```

The frontend lives in `src/` (React + TypeScript + Tailwind) and the backend in `src-tauri/src/` (Rust). See the "Project structure" section of the [README](README.md) for a map of the files.

## Making changes

- Create a branch from `main`, for example `fix/playlist-progress` or `feat/proxy-setting`.
- Keep pull requests focused: one fix or feature per PR.
- **Match the surrounding code.** Follow the existing naming, file layout and comment style. UI changes should use the existing Studio Deck classes in `src/index.css` (`.card`, `.btn-amber`, `.btn-ghost`, `.label`, `.num`, `.chip`, `.section-title`) and the `deck` / `signal` colors rather than new ad-hoc styles.
- If you add a new Tauri command, register it in `src-tauri/src/lib.rs` and add a typed wrapper in `src/api.ts`. If it needs a new plugin permission, add it to `src-tauri/capabilities/default.json`.
- Keep the TypeScript types in `src/types.ts` in sync with the serde structs in `src-tauri/src/models.rs` (fields are camelCase on both sides).

## Before you open a pull request

Run these and make sure they pass. CI runs the same checks.

```bash
npm run build:vite             # TypeScript type check + frontend build
cd src-tauri && cargo test     # Rust unit tests
```

If you changed how yt-dlp output is parsed, add a test case to the `tests` module in `src-tauri/src/parser.rs`.

### Optional: end-to-end test

`scripts/cdp-drive.cjs` drives the real app through its UI (paste a link, Analyze, Download) and logs the button, queue, history and toast state every second. It needs a build with the WebView2 debug port enabled:

```bash
npm run tauri build -- --no-bundle --config src-tauri/tauri.e2e.conf.json
# start src-tauri/target/release/vid-download.exe, then:
node scripts/cdp-drive.cjs "https://archive.org/details/BigBuckBunny_124" 360
```

Never ship a build made with `tauri.e2e.conf.json`, because it exposes a debugging port.

## Releasing (maintainers)

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (keep all three the same).
2. Commit, then tag and push: `git tag v1.0.1 && git push origin v1.0.1`.
3. The **Release** workflow builds the installer and creates a **draft** GitHub Release. Review it, then click **Publish**.

## Commit messages

Write short, imperative summaries, for example "Fix speed formatting in queue rows" or "Add proxy setting". Add a body if the reason for the change isn't obvious from the diff.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
