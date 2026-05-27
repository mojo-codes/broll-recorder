# Security

## Supported Version

Only the latest GitHub Release is supported.

## Reporting

Please do not publish sensitive vulnerability details in a public issue before the fix is ready. Share the reproduction steps and affected version directly with the maintainer.

## Project Notes

- No API keys or private tokens are required in the app bundle.
- Do not commit real tokens, certificates, signing keys or private configuration files.
- The GitHub release workflow uses the repository-scoped `GITHUB_TOKEN` provided by GitHub Actions.
- Auto-updates are served from public GitHub Releases.
