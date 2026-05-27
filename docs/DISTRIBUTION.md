# Distribution

## Ziel

Luisa installiert die App einmal über einen GitHub-Release-Download. Danach prüft die App selbst auf neue Releases und kann ein heruntergeladenes Update installieren.

## Release erstellen

1. Versionsnummer in `package.json` erhöhen.
2. Änderungen committen und pushen.
3. Tag setzen und pushen:

```bash
git tag v0.1.3
git push origin main --tags
```

Wenn `.github/workflows/release.yml` im Repo aktiv ist, baut GitHub Actions danach macOS- und Windows-Artefakte und legt sie als Draft Release an. Den Draft prüfen, Release Notes ergänzen und veröffentlichen.

Hinweis: Das lokale Workflow-File braucht beim Push einen GitHub-Token mit `workflow`-Scope.

Der GitHub-Workflow baut:

- macOS als x64-Build auf `macos-15-intel`
- Windows als x64-Installer

## Manuell veröffentlichen

Für ein manuelles Plattform-Publishing:

```bash
npm run release:github:mac
npm run release:github:win
```

Manuelles Publizieren sollte nur mit einem lokal konfigurierten GitHub-Login passieren. Keine Tokens in Code, Docs oder App-Bundles einbauen.

## Download für Luisa

- macOS: `.dmg`
- Windows: `.exe` / NSIS-Installer

Für Auto-Updates müssen die GitHub Releases öffentlich erreichbar sein. Bei privaten Repos braucht die App Update-Authentifizierung; das sollte nicht mit einem fest eingebauten Token gelöst werden.

## Professionelle Signierung

Für wirklich reibungslose Installation auf fremden Rechnern braucht macOS eine Apple Developer ID mit Hardened Runtime, Notarization und Stapling. Windows funktioniert technisch ohne Zertifikat, zeigt dann aber häufiger SmartScreen-Warnungen; ein Code-Signing-Zertifikat reduziert das.

## Diagnose

Die App schreibt Logs lokal. In den Einstellungen gibt es:

- `Log öffnen`
- `Diagnose kopieren`

Damit kann Luisa dir bei Fehlern den Log oder die kompakte Diagnose schicken, ohne technische Pfade suchen zu müssen.
