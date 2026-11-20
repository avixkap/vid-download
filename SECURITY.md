# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

**Please do not report security issues in public GitHub issues.**

Report them privately through GitHub: open the repository's **Security** tab and click **Report a vulnerability**. If that option isn't available, email **avixkap@gmail.com** with "VidDownload security" in the subject.

Please include:

- a description of the issue and its impact
- steps to reproduce, or a proof of concept
- the app version and your Windows version

You can expect an initial reply within 7 days. Once a fix is released, you'll be credited in the release notes unless you prefer to stay anonymous.

## Scope

Examples of issues we want to hear about:

- the UI being able to run commands or access files beyond what `src-tauri/capabilities/default.json` grants
- untrusted input (URLs, video metadata, yt-dlp output) leading to command injection or arbitrary file writes
- the first-run component download (`src-tauri/src/binaries.rs`) being tricked into installing something other than yt-dlp or ffmpeg

Vulnerabilities in yt-dlp or FFmpeg themselves should be reported to those projects.
