# Distribution

## Ziel

Luisa installiert die App einmal über einen GitHub-Release-Download. Danach prüft die App selbst auf neue Releases und kann ein heruntergeladenes Update installieren.

## Release erstellen

1. Versionsnummer in `package.json` erhöhen.
2. Änderungen committen und pushen.
3. Tag setzen und pushen:

```bash
git tag v0.1.1
git push origin main --tags
```

GitHub Actions baut danach macOS- und Windows-Artefakte und legt sie als Draft Release an. Den Draft prüfen, Release Notes ergänzen und veröffentlichen.

## Manuell von diesem Mac veröffentlichen

```bash
GH_TOKEN=<github-token> npm run release:github
```

## Download für Luisa

- macOS: `.dmg`
- Windows: `.exe` / NSIS-Installer

Für Auto-Updates müssen die GitHub Releases öffentlich erreichbar sein. Bei privaten Repos braucht die App Update-Authentifizierung; das sollte nicht mit einem fest eingebauten Token gelöst werden.

## Professionelle Signierung

Für wirklich reibungslose Installation auf fremden Rechnern braucht macOS eine Apple Developer ID mit Notarization. Windows funktioniert technisch ohne Zertifikat, zeigt dann aber häufiger SmartScreen-Warnungen; ein Code-Signing-Zertifikat reduziert das.

## Diagnose

Die App schreibt Logs lokal. In den Einstellungen gibt es:

- `Log öffnen`
- `Diagnose kopieren`

Damit kann Luisa dir bei Fehlern den Log oder die kompakte Diagnose schicken, ohne technische Pfade suchen zu müssen.
