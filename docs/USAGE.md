# B-Roll Recorder - Kurzanleitung

## Start

```bash
npm install
npm run dev
```

Die Desktop-App startet automatisch. Für einen lokalen Build:

```bash
npm run package
```

Das macOS-App-Bundle liegt danach unter:

```text
release/mac/B-Roll Recorder.app
```

## Aufnahme

1. Format wählen: `Handy`, `Breit` oder `Text groß`.
2. Qualität wählen: `Normal`, `Text scharf` oder `Flüssig`.
3. `Name`, `Was ist zu sehen?` und `Was passiert?` setzen.
4. Speicherort prüfen.
5. `Rahmen setzen`, den Rahmen positionieren und skalieren.
6. Im Overlay `Fertig` klicken, dann `Aufnehmen` starten.
7. Nach dem Countdown aufnehmen, danach im schwebenden Fenster `Pause`, `Weiter` oder `Stop` nutzen.

Die App exportiert eine H.264-MP4 und zeigt Pfad, Auflösung, FPS, Dauer, Dateigröße und Quellmodus.

## Defaults

- Default-Speicherort, wenn vorhanden:
  `/Users/mojo/Social Media Growth/Recordings Social Media.nosync/Broll/_inbox/new_unsorted`
- Default-Qualität: `Text scharf`
- Default-Hotkeys:
  - Start/Stop: `Cmd/Ctrl + Shift + R`
  - Pause/Weiter: `Cmd/Ctrl + Shift + P`
  - Rahmen setzen/anzeigen: `Cmd/Ctrl + Shift + F`

## Hinweise

- Auf macOS muss Bildschirmaufnahme für die App erlaubt sein.
- `Handy` ist für Vollbild-Szenen im Hochformat. Auf einem 16:9-Monitor wird der Quellbereich kleiner als 1080x1920 sein und hochskaliert.
- `Breit` ist für Website-/Desktop-B-Roll und Split-Screen-Quellen.
- `Text groß` ist für textlastige Proof-Screens im oberen Remotion-Bereich.
- Das Rahmen-Overlay ist transparent und kann mit `Fertig`, `Enter` oder `Esc` geschlossen werden.
- Der sichtbare Rahmen wird vor der Aufnahme ausgeblendet und kann während der Aufnahme wieder ein- oder ausgeblendet werden.
- Wenn die Quelle kleiner als das Exportformat ist, wird der Quellmodus als `scaled` angezeigt.
- Die URL-/Web-Capture-Ansicht ist noch Phase 2.

## Updates und Diagnose

- `Update prüfen` sucht in der installierten App nach neuen GitHub-Releases.
- Wenn ein Update fertig geladen ist, installiert `Update installieren` die neue Version und startet die App neu.
- In den Einstellungen kann `Log öffnen` den lokalen Log-Ordner anzeigen.
- `Diagnose kopieren` kopiert Version, Plattform, Update-Status und Log-Pfad in die Zwischenablage.
- Release-Ablauf: `docs/DISTRIBUTION.md`.
