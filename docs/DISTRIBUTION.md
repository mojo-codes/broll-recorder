# Distribution

## Ziel

Luisa installiert die App einmal über einen GitHub-Release-Download. Danach prüft die App selbst auf neue Releases und kann ein heruntergeladenes Update installieren.

## Release erstellen

1. Versionsnummer in `package.json` erhöhen.
2. Änderungen committen und pushen.
3. Tag setzen und pushen:

```bash
git tag v0.1.6
git push origin main --tags
```

Wenn `.github/workflows/release.yml` im Repo aktiv ist, baut GitHub Actions danach Windows-Artefakte und prüft den macOS-Build. Den Draft prüfen, Release Notes ergänzen und veröffentlichen.

Hinweis: Das lokale Workflow-File braucht beim Push einen GitHub-Token mit `workflow`-Scope.

Der GitHub-Workflow baut:

- macOS als x64-Build auf `macos-15-intel`, aber ohne Publishing
- Windows als x64-Installer

macOS wird bis zur Developer-ID-Notarisierung lokal signiert und dann manuell in denselben Release hochgeladen. Das verhindert ad-hoc-signierte CI-Artefakte, die macOS-Bildschirmaufnahme-Berechtigungen unzuverlässig machen können.

## Manuell veröffentlichen

Für ein manuelles Plattform-Publishing:

```bash
npm run release:github:mac
npm run release:github:win
```

Manuelles Publizieren sollte nur mit einem lokal konfigurierten GitHub-Login passieren. Keine Tokens in Code, Docs oder App-Bundles einbauen.

Für den aktuellen lokalen macOS-Signaturpfad:

```bash
CSC_NAME="Apple Development: joshua-mosley@web.de (3335888YLV)" npm run dist:mac:signed-local
```

Danach die macOS-Dateien mit den Release-Namen hochladen:

```bash
mkdir -p /tmp/broll-release
cp -p "release/B-Roll Recorder-0.1.6-mac-x64.dmg" /tmp/broll-release/B-Roll-Recorder-0.1.6-mac-x64.dmg
cp -p "release/B-Roll Recorder-0.1.6-mac-x64.dmg.blockmap" /tmp/broll-release/B-Roll-Recorder-0.1.6-mac-x64.dmg.blockmap
cp -p "release/B-Roll Recorder-0.1.6-mac-x64.zip" /tmp/broll-release/B-Roll-Recorder-0.1.6-mac-x64.zip
cp -p "release/B-Roll Recorder-0.1.6-mac-x64.zip.blockmap" /tmp/broll-release/B-Roll-Recorder-0.1.6-mac-x64.zip.blockmap
cp -p release/latest-mac.yml /tmp/broll-release/latest-mac.yml
gh release upload v0.1.6 --repo mojo-codes/broll-recorder --clobber /tmp/broll-release/*
```

Die Versionsnummer im Beispiel bei neuen Releases entsprechend ersetzen.

## Download für Luisa

- macOS: `.dmg`
- Windows: `.exe` / NSIS-Installer

Für Auto-Updates müssen die GitHub Releases öffentlich erreichbar sein. Bei privaten Repos braucht die App Update-Authentifizierung; das sollte nicht mit einem fest eingebauten Token gelöst werden.

## Professionelle Signierung

Die macOS-Builds werden ohne Developer-ID-Zertifikat mindestens ad-hoc signiert, damit sie nicht komplett unsigniert sind. Für wirklich reibungslose Installation auf fremden Rechnern braucht macOS trotzdem eine Apple Developer ID mit Hardened Runtime, Notarization und Stapling. Windows funktioniert technisch ohne Zertifikat, zeigt dann aber häufiger SmartScreen-Warnungen; ein Code-Signing-Zertifikat reduziert das.

## Diagnose

Die App schreibt Logs lokal. In den Einstellungen gibt es:

- `Log öffnen`
- `Diagnose kopieren`

Damit kann Luisa dir bei Fehlern den Log oder die kompakte Diagnose schicken, ohne technische Pfade suchen zu müssen.
