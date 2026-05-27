# B-Roll Recorder

Desktop recorder for clean social media B-roll on macOS and Windows.

The app helps capture reusable screen clips for TikTok, Instagram, LinkedIn and Remotion workflows without manually guessing aspect ratios, frame sizes, filenames or export settings.

## Features

- Preset capture formats: `Handy` (`1080x1920`), `Breit` (`1920x1080`) and `Text groß` (`1080x850`).
- Quality presets: `Normal`, `Text scharf` and `Flüssig`.
- Movable and resizable recording frame with locked aspect ratio.
- Floating recording controls with timer, pause/resume, stop and frame toggle.
- H.264 MP4 export for easy use in video editors and Remotion.
- Auto-update through GitHub Releases.
- Local diagnostics: open logs or copy a compact diagnostic report from settings.

## Download

Use the latest GitHub Release:

- macOS: download the `.dmg`
- Windows: download the `.exe`

Unsigned builds can show macOS Gatekeeper or Windows SmartScreen warnings. For fully professional distribution, the app needs Apple Developer ID notarization on macOS and code signing on Windows.

## Usage

1. Choose a format.
2. Choose a quality preset.
3. Fill in `Name`, `Was ist zu sehen?` and `Was passiert?`.
4. Choose the output folder.
5. Click `Rahmen setzen`, position the frame, then click `Fertig`.
6. Click `Aufnehmen`.
7. Use the floating controls or shortcuts to pause, show the frame, or stop.

Default shortcuts:

- Start/stop: `Cmd/Ctrl + Shift + R`
- Pause/resume: `Cmd/Ctrl + Shift + P`
- Set/show frame: `Cmd/Ctrl + Shift + F`

More details: [docs/USAGE.md](docs/USAGE.md).

## Development

```bash
npm install
npm run dev
```

Create a local app bundle:

```bash
npm run package
```

Create release artifacts:

```bash
npm run dist
```

## Distribution

Release builds are created by GitHub Actions when a `v*` tag is pushed. The app uses GitHub Releases for auto-updates.

See [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md).

## Security Notes

- The app does not require bundled API keys or private tokens.
- GitHub Actions uses GitHub's built-in `GITHUB_TOKEN` only inside the release workflow.
- User settings and logs stay local on the user's machine.
- Renderer windows use context isolation, disabled Node integration and sandboxed preload scripts.
