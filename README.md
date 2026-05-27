# B-Roll Recorder Tool - PRD und Architektur
#tool #video #broll #screen-recording

Stand: 27.05.2026

Dieses Dokument ist als Handoff-Spezifikation gedacht. Eine andere KI soll ohne den alten Chatverlauf verstehen, was gebaut werden soll, warum es gebaut wird und welche lokalen Referenzen relevant sind.

## Aktueller Umsetzungsstand

Der Ordner enthält jetzt ein Electron-, TypeScript- und React-Projekt für den MVP.

```bash
npm install
npm run dev
```

Für ein lokales macOS-App-Bundle:

```bash
npm run package
```

Kurze Bedienung: `docs/USAGE.md`.

Distribution und Auto-Update über GitHub Releases: `docs/DISTRIBUTION.md`.

## Ziel

Ein einfaches Desktop-Tool für Joshua und Luisa, das hochwertiges B-Roll-Material für TikTok-, Instagram- und Remotion-Videos aufnimmt, ohne jedes Mal manuell Seitenverhältnisse, Pixel, Speicherorte und Qualität treffen zu müssen.

Das Tool soll auf macOS und Windows laufen, per Doppelklick startbar sein und aus wiederkehrenden Screen- oder Web-Aufnahmen direkt saubere, weiterverwendbare Clips erzeugen.

## Simplicity Contract

Das Produkt muss sich wie ein sehr einfaches Aufnahme-Tool anfühlen. Keine Fachbegriffe in der Haupt-UI, keine langen Erklärtexte, keine unnötigen Optionen.

Haupt-UI zeigt maximal:

1. `Format`
2. `Qualität`
3. `Name`
4. `Speichern unter`
5. `Aufnehmen`

Alles Weitere gehört in `Einstellungen` oder später in `Erweitert`.

User-facing Labels müssen so einfach sein, dass ein Kind versteht, was passiert:

- `Handy` statt `Vertical 9:16`
- `Breit` statt `Wide 16:9`
- `Text groß` statt `Upper Proof`
- `Normal` statt `Standard`
- `Text scharf` statt `Sharp UI`
- `Flüssig` statt `Smooth`

Technische Werte wie `1080x1920`, FPS und Bitrate dürfen sichtbar sein, aber nur als kleine Unterzeile oder Tooltip, nicht als Hauptentscheidung.

## Problem

Aktueller Workflow:

- macOS Screen Recording über `Cmd + Shift + 5`.
- Aufnahmebereich wird manuell gezogen.
- Seitenverhältnis und Pixelgröße sind schwer exakt zu treffen.
- Für Remotion gibt es unterschiedliche Einsätze: Fullscreen 9:16, breite 16:9-B-Roll, Split-Screen, kleine Overlays, große Proof-Screens.
- Textlastige Screens wie Content Control Center, Website-Backend, Sheets oder Code verlieren schnell Lesbarkeit, wenn falsch aufgenommen oder später zu stark verkleinert wird.
- Luisa soll das gleiche Tool auf Windows nutzen können, ohne technische Einrichtung.

## Nicht-Ziele

- Kein vollwertiger OBS-Ersatz.
- Keine komplexe Schnittsoftware.
- Keine automatische KI-Benennung in V1.
- Keine Social-Platform-Uploads.
- Kein Cloud-Service. Alles lokal.
- Kein hart verdrahteter MojoMakes-Speicherort. Der MojoMakes-Pfad darf Default sein, muss aber konfigurierbar bleiben.
- Keine überladene Preset-Sammlung. Lieber 3 gute Modi als 12 halbklare Optionen.

## Kernprinzip

Für Nutzer fühlt sich alles wie "Aufnehmen" an. Technisch braucht das Tool aber zwei Wege, weil pixelgenaue Web-B-Roll andere Anforderungen hat als freie Desktop-Aufnahmen.

1. **Freier Bildschirm-Frame**
   - Ein sichtbarer, formatgesperrter Rahmen liegt über beliebigen Apps.
   - Nutzer positioniert Fenster/Inhalt selbst.
   - Beim Record-Start verschwindet der Rahmen aus der Aufnahme.
   - Gut für beliebige Software, Desktop, Finder, Tools, bestehende Browserfenster.

2. **Pixelgenauer Web-/App-Browser**
   - Das Tool öffnet eine eigene Capture-Ansicht mit URL-Leiste.
   - Der sichtbare Web-Inhalt hat exakt das Ziel-Format, ohne Browser-Tabs, Toolbar oder Fensterkante im Bild.
   - Responsiveness wird sauber getestet, weil die Content-Area exakt gesetzt ist.
   - Gut für Websites, Content Control Center, Landingpages, lokale Dashboards, Webapps.

Die UI darf diese technische Trennung einfach formulieren:

- `Rahmen aufnehmen`
- `URL im Capture-Fenster öffnen`

Die App bleibt trotzdem ein einziges Aufnahme-Tool. Die zwei Wege sind nur Hilfen, um entweder beliebige Bildschirminhalte oder Web-Inhalte bestmöglich aufzunehmen.

In der ersten sichtbaren Version darf sogar nur `Aufnehmen` dominant sein. `URL öffnen` ist ein kleiner Zusatz für Web-B-Roll, nicht ein zweites großes Produkt.

## Hauptnutzer

- Joshua: macOS, MojoMakes/Suppstantial B-Roll, Remotion-Workflow, hohe Wiederverwendung.
- Luisa: Windows, einfache Bedienung, eigener Speicherort, keine Workspace-Pfade voraussetzen.

## User Stories

- Als Nutzer will ich `Handy`, `Breit` oder `Text groß` wählen und sicher sein, dass die Datei im richtigen Format landet.
- Als Nutzer will ich eine Website so aufnehmen, dass nur der Inhalt im Video ist, nicht die Browserleiste.
- Als Nutzer will ich den Browser/Inhalt auf das Aufnahmeformat anpassen, statt selbst Fenster millimetergenau zu ziehen.
- Als Nutzer will ich zwischen `Normal`, `Text scharf` und `Flüssig` wählen, ohne Bitrate verstehen zu müssen.
- Als Nutzer will ich einen Speicherort einstellen und wiederverwenden.
- Als Nutzer will ich Dateinamen halbautomatisch aus einfachen Feldern bauen.
- Als Nutzer will ich erkennen, wenn die Quelle zu klein für das gewünschte Output-Format ist.
- Als Nutzer will ich einen Countdown und einen klaren Record/Stop-Zustand.
- Als Nutzer will ich Clips direkt in Remotion verwenden können.

## Presets

### Format-Presets

| UI-Label | Interner Name | Ziel | Output |
|---|---|---|---|
| `Handy` | `vertical` | TikTok/Reels Fullscreen, Handyformat | `1080x1920` |
| `Breit` | `wide` | Website-/Desktop-B-Roll, Split-Screen-Quelle | `1920x1080` |
| `Text groß` | `upper-proof` | textlastige Proof-B-Roll für Remotion oben groß | `1080x850` |
| `Eigene Größe` | `custom` | Sonderfälle, in V1 hinter Einstellungen verstecken | Nutzerdefiniert |

`Text groß` ist kein finales Social-Format, sondern ein Produktionsformat für MojoMakes-Remotion-Videos, weil textlastige Screens oft fast die ganze obere Bildbreite bekommen.

`Quadrat` bleibt bewusst aus der Haupt-UI, bis es wirklich gebraucht wird.

### Qualitäts-Presets

| UI-Label | Interner Name | Einsatz | FPS | Zielqualität |
|---|---|---|---:|---|
| `Normal` | `standard` | normale Scrolls, einfache UI, kurze Demos | 30 | ca. 12-16 Mbps bei 1080p |
| `Text scharf` | `sharp-ui` | Text, Code, Sheets, Control Center, Website-Backend | 30 | ca. 20-28 Mbps bei 1080p |
| `Flüssig` | `smooth` | sichtbare Mausbewegung, Animationen, schnelle Scrolls | 60 | ca. 28-40 Mbps bei 1080p |
| `4K` | `4k-sharp` | nur in Einstellungen/Erweitert, wenn Quelle es hergibt | 30 | ca. 45-70 Mbps bei 4K |

Default für MojoMakes-B-Roll: `Text scharf`, 30fps, H.264 MP4.

Regel: 4K nur anbieten, wenn die Quelle genug echte Pixel liefern kann. Kein stilles Hochskalieren als Qualitätsversprechen. Wenn hochskaliert wird, muss die UI sagen: `Quelle kleiner als Output - wird skaliert`.

## Pixel-Realität

Das Tool darf nie so tun, als würde ein kleiner Bildschirm durch Export-Einstellungen echte 4K-Details erzeugen.

- Wenn eine freie 9:16-Aufnahme auf einem 1920x1080-Monitor gemacht wird, passt ein echter `1080x1920`-Rahmen physisch nicht auf den Bildschirm. Das Tool kann dann nur den größtmöglichen 9:16-Quellbereich aufnehmen und auf `1080x1920` skalieren.
- Für Text/UI ist das oft trotzdem brauchbar, wenn die UI im Quellbereich groß genug ist.
- Für pixelperfekte Web-B-Roll ist die eigene Capture-Webview besser, weil sie den Content-Viewport kontrolliert und Browserchrome ausblendet.
- Das Tool muss anzeigen, ob die Quelle `native`, `retina/high-dpi` oder `scaled` exportiert wird.

## Ausgabeformat

V1-Default:

- Container: `.mp4`
- Video: H.264, `yuv420p`, hohe Kompatibilität mit Remotion, DaVinci, TikTok/Instagram
- Audio: optional, default aus
- Cursor: optional, default an für Prozess-Demos
- Klick-Anzeige: optional, default aus

Interne Aufnahme darf technisch zuerst WebM/VP9 sein, wenn die Cross-Platform-Engine das stabiler macht. Die finale Datei muss aber als H.264 MP4 im Zielordner liegen.

## Benennung

Konfigurierbare Dateinamen-Templates, Default:

```text
br_<brand>_<function>_<subject>_<action>_<format>_<date>_v<version>.mp4
```

Beispiel:

```text
br_mojo_process_control-center_scroll_vert_20260527_v01.mp4
```

Pflichtfelder in V1:

- `brand`: `mojo`, `supp`, `shared`, frei editierbar
- `function`: `process`, `proof`, `trust`, `health`, frei editierbar
- `subject`: Freitext/Slug
- `action`: `scroll`, `click`, `overview`, `demo`, `typing`, frei editierbar
- `format`: automatisch aus Preset, z. B. `vert`, `wide`, `square`, `upper-proof`

Für Luisa muss das Template im Settings-Screen änderbar sein.

Die Haupt-UI soll keine Template-Sprache zeigen. Sie zeigt einfache Felder:

- `Projekt`: z. B. `mojo`, `supp`, `shared`
- `Was ist zu sehen?`: z. B. `control-center`, `website`, `shopify`
- `Was passiert?`: z. B. `scroll`, `demo`, `click`

Aus diesen Feldern baut das Tool den Dateinamen automatisch. Das Template ist nur in den Einstellungen sichtbar.

## Speicherorte

Default auf Joshuas Mac:

```text
/Users/mojo/Social Media Growth/Recordings Social Media.nosync/Broll/_inbox/new_unsorted/
```

Anforderungen:

- Speicherort frei wählbar.
- Letzten Speicherort merken.
- Optional mehrere Profile: `Joshua`, `Luisa`, `Projekt`.
- Keine harte Abhängigkeit vom Social-Media-Growth-Workspace.
- Wenn der MojoMakes-Workspace erkannt wird, optional nach Aufnahme den B-Roll-Indexer anbieten.

## UX-Fluss

### First Launch

1. Kurzer Setup-Screen:
   - Speicherort wählen.
   - Default-Qualität wählen.
   - macOS/Windows Screen-Recording-Permission prüfen.
2. Testaufnahme-Button mit 3 Sekunden.
3. Hinweis: sensible Daten vor Aufnahme prüfen.

### Standardaufnahme

1. App öffnen.
2. Format wählen: `Handy`, `Breit`, `Text groß`.
3. Qualität wählen: Default `Text scharf`.
4. Optional Name-Felder setzen.
5. `Rahmen anzeigen`.
6. Rahmen verschieben/skalieren, Seitenverhältnis bleibt gesperrt.
7. `Record` oder Hotkey.
8. Countdown 3-2-1.
9. Rahmen verschwindet.
10. Aufnahme läuft, kleines Kontrollfenster bleibt außerhalb der Capture-Zone.
11. `Stop`.
12. Tool schreibt MP4 und zeigt:
    - Pfad
    - Auflösung
    - FPS
    - Dauer
    - Dateigröße
    - `In Ordner zeigen`

### Pixelgenaue Web-Aufnahme

1. `URL im Capture-Fenster öffnen`.
2. Preset wählen.
3. Tool öffnet eigene Web-Capture-Ansicht.
4. Der Web-Inhaltsbereich hat exakt die Preset-Maße oder eine skalierte Vorschau mit echter Zielauflösung.
5. Nutzer interagiert, scrollt, klickt.
6. Aufnahme zeichnet nur Content-Area auf, nicht App-Toolbar.

V1 darf für Web-Capture mit sichtbarer, exakt großer Content-Area starten. V2 kann eine skalierte Vorschau mit höherer Offscreen-Zielauflösung ergänzen.

## Browser-/Responsiveness-Anforderung

Für Web-B-Roll reicht ein normaler Overlay-Rahmen nicht immer, weil:

- Browser-Toolbar und Fensterkante sonst im Capture landen können.
- Der sichtbare Content nicht exakt dem gewünschten Viewport entspricht.
- Responsive Breakpoints vom Content-Viewport abhängen, nicht vom äußeren Fenster.

Deshalb bekommt das Tool eine eigene Capture-Webview:

- `setContentBounds`/Content-Area auf Zielmaß setzen.
- Optional Device Scale Factor anzeigen.
- URL-Bar außerhalb der aufzunehmenden Content-Area.
- Button `Handy`, `Breit`, `Text groß`.
- Optional `Open current URL` über Copy/Paste, keine Browser-Extension in V1.

Phase 2 kann externe Browserfenster per Accessibility/UI-Automation positionieren. Das ist nicht MVP-kritisch, weil es auf macOS zusätzliche Rechte und auf Windows andere APIs braucht.

Klare Entscheidung: V1 muss nicht versuchen, ein bereits geöffnetes Chrome-/Safari-/Edge-Fenster pixelgenau umzubauen. V1 bietet dafür ein eigenes Capture-Fenster. Externe Browserfenster exakt an einen Rahmen anzupassen ist Phase 2, weil das auf macOS und Windows unterschiedlich gelöst werden muss und zusätzliche Berechtigungen erzeugt.

## Nutzung durch Codex/KI

Das Tool ist primär für Menschen gebaut, kann aber später auch Codex/KI helfen, wenn Joshua sagt: "Geh auf diese Seite und mach mir B-Roll."

Sinnvoller KI-Use-Case:

- Codex öffnet eine URL im Capture-Fenster.
- Codex wählt `Breit`, `Handy` oder `Text groß`.
- Codex startet eine Aufnahme.
- Codex führt definierte Aktionen aus: Scroll, Hover, Klick, Fokus auf Bereich.
- Codex stoppt die Aufnahme und prüft per FFprobe Auflösung/FPS/Dauer.

Für besonders glatte Web-B-Roll kann Codex alternativ weiterhin eigene Browser-/Playwright-/FFmpeg-Wege nutzen. Das B-Roll Recorder Tool wird trotzdem nützlich, wenn die Aufnahme später reproduzierbar, UI-gesteuert und für Joshua/Luisa identisch bedienbar sein soll.

Wichtig für die Implementierung:

- Eine einfache CLI oder lokale IPC-Schnittstelle ist in Phase 2 sinnvoll, aber nicht MVP.
- MVP muss zuerst für Menschen sauber funktionieren.
- KI-Steuerung darf die Haupt-UI nicht komplizierter machen.

Mögliche Phase-2-CLI:

```bash
broll-recorder record-url "https://example.com" --format wide --quality sharp-ui --action scroll --seconds 8
```

Diese CLI ist optional. Sie darf erst gebaut werden, wenn die Desktop-App stabil ist.

## Technische Architektur

### Empfohlener Stack

- Desktop-App: Electron + TypeScript + React
- Packaging: Electron Forge oder Electron Builder
- Encoding/Post-Processing: gebündeltes FFmpeg
- Settings: lokale JSON-Datei im User-Data-Verzeichnis
- Video-Inspektion: `ffprobe` oder FFmpeg-Probe nach Export

Warum Electron:

- Cross-platform macOS/Windows.
- Kann transparente Always-on-top-Overlay-Fenster bauen.
- Hat `desktopCapturer` für Screen-/Fensterquellen.
- Kann eigene Browserfenster/Webviews für pixelgenaue Web-B-Roll öffnen.
- Passt zur bestehenden JS/Remotion-Nähe im Workspace.

### Hauptmodule

```text
broll-recorder/
  src/main/
    app.ts
    windows/
      controlWindow.ts
      frameOverlayWindow.ts
      webCaptureWindow.ts
    recording/
      recorderController.ts
      mediaRecorderAdapter.ts
      ffmpegTranscode.ts
      probeOutput.ts
    presets/
      formats.ts
      quality.ts
      naming.ts
    settings/
      settingsStore.ts
  src/renderer/
    ControlApp.tsx
    components/
      PresetPicker.tsx
      QualityPicker.tsx
      NamingFields.tsx
      OutputPicker.tsx
      RecordingStatus.tsx
    overlay/
      FrameOverlay.tsx
    webcapture/
      WebCaptureShell.tsx
  package.json
```

### Recording-Strategie

V1 bevorzugt eine robuste Cross-Platform-Strategie:

1. Screen oder Fensterquelle über Electron Desktop Capture auswählen.
2. Crop-Region aus Overlay-Koordinaten berechnen.
3. Aufnahme-Stream in ein Canvas mit exakten Output-Maßen zeichnen.
4. Canvas-Stream mit gewünschter FPS aufnehmen.
5. Hohe interne Bitrate setzen.
6. Nach Stop per FFmpeg zu H.264 MP4 transcodieren.
7. Mit `ffprobe` Auflösung/FPS/Dauer prüfen.

Risiken:

- Overlay darf nicht in der Aufnahme erscheinen. Lösung: Rahmen nach Countdown ausblenden.
- Retina/Windows-DPI-Skalierung kann Koordinaten verschieben. Lösung: Scale-Factor-Testbild und automatische Kalibrierung.
- MediaRecorder-Codecs unterscheiden sich je Plattform. Lösung: interne Aufnahme nicht als finales Format betrachten, immer MP4-Export prüfen.

Fallback-Strategie:

- macOS: regionbasierte Aufnahme über `screencapture -v -R` prüfen.
- Windows: FFmpeg `gdigrab` region capture prüfen.
- Diese Fallbacks bleiben Plattformadapter, nicht Haupt-UX.

## Hotkeys

Default:

- Start/Stop: `Cmd/Ctrl + Shift + R`
- Rahmen anzeigen/verbergen: `Cmd/Ctrl + Shift + F`
- Preset wechseln: optional später

Hotkeys müssen konfigurierbar sein, weil sie mit anderen Apps kollidieren können.

## Qualitätsregeln für MojoMakes-B-Roll

- Für textlastige Web-/UI-Screens `Text scharf` nutzen.
- Lieber UI größer aufnehmen als später in Remotion stark zoomen.
- Bei Control Center, Sheets, Code, Website-Backend: Ziel ist erkennbare Struktur und lesbare Hauptlabels auf Smartphone-Größe.
- Keine Aufnahme mit sensiblen Daten in `selects/` verschieben.
- Wiederverwendbare Clips bleiben 4-12 Sekunden oder werden später zu Selects gekürzt.
- Neue Clips landen zuerst in `_inbox/new_unsorted/`, nicht direkt in `selects/`.

## Datenschutz und Sicherheit

- Keine Cloud.
- Keine Telemetrie in V1.
- Keine automatische Aufnahme ohne sichtbaren Countdown.
- Klare Warnung vor sensiblen Daten.
- Optionaler `Privacy Mask` in späterer Version: fixe Bereiche vor Aufnahme ausblenden oder im Export schwärzen.

## Einstellungen

Lokale Settings:

```json
{
  "outputDir": "...",
  "defaultFormatPreset": "vertical",
  "defaultQualityPreset": "sharp-ui",
  "filenameTemplate": "br_<brand>_<function>_<subject>_<action>_<format>_<date>_v<version>",
  "defaults": {
    "brand": "mojo",
    "function": "process",
    "action": "scroll"
  },
  "hotkeys": {
    "recordToggle": "CommandOrControl+Shift+R",
    "frameToggle": "CommandOrControl+Shift+F"
  },
  "showCursor": true,
  "recordAudio": false
}
```

## Roadmap

### Phase 1 - MVP

- Electron-App startet per Doppelklick.
- macOS und Windows Dev-Builds.
- Format-Presets: `Handy`, `Breit`, `Text groß`.
- Qualitäts-Presets: `Normal`, `Text scharf`, `Flüssig`.
- Overlay-Rahmen mit gesperrtem Seitenverhältnis.
- Countdown, Start/Stop, Hotkey.
- Konfigurierbarer Speicherort.
- Konfigurierbarer Dateiname.
- Export als H.264 MP4.
- Export-Prüfung mit Auflösung, FPS, Dauer.

### Phase 2 - Web Capture

- Eigene Web-Capture-Ansicht mit URL-Leiste.
- Content-Area ohne Browserchrome aufnehmen.
- Buttons für `Handy`, `Breit`, `Text groß`.
- Responsive Preview sauber über Content-Viewport.
- Optional lokale URLs und häufige URLs speichern.

### Phase 3 - Library Integration

- Nach Export `index_broll_library.py` optional starten, wenn Workspace erkannt.
- Clip-Metadaten als Sidecar-JSON speichern.
- Schneller Button `Als Select markieren`.
- Verbindung zum B-Roll-Katalog.

### Phase 4 - Komfort

- Trim Start/End direkt nach Aufnahme.
- Privacy Mask.
- Preset-Sets für Joshua/Luisa/Projekt.
- Optional automatische Screenshots/Posterframes.
- Optional AI-gestützte Dateinamen-Vorschläge.
- Optional CLI/IPC für Codex-gesteuerte URL-Aufnahmen.

## Implementierungsreihenfolge

1. Neues `broll-recorder/`-Projekt mit Electron, TypeScript und React scaffolden.
2. Settings-Store, Preset-Definitionen und Naming-Logik implementieren.
3. Control Window bauen: Presets, Qualität, Zielordner, Naming-Felder, Start/Stop.
4. Overlay Window bauen: draggable/resizable, Seitenverhältnis gesperrt, Koordinaten sauber messen.
5. Recording-Adapter bauen: Screen-Quelle, Crop, Canvas-Output, MediaRecorder, temporäre Datei.
6. FFmpeg-Export zu H.264 MP4 und FFprobe-Prüfung ergänzen.
7. macOS-Test: Permissions, Retina, interner/externer Monitor.
8. Windows-Test: Standard-DPI und Display-Scaling.
9. Web-Capture-Fenster ergänzen, sobald der freie Frame stabil ist.
10. README und kurze Bedienanleitung für Joshua/Luisa schreiben.

## Projektablage

Das Tool soll nicht innerhalb von `/Users/mojo/Social Media Growth/` gebaut werden.

Ziel ist ein eigener Tool-Ordner in Joshuas übergeordnetem Mojo-Tool-Bereich. Den finalen Pfad liefert Joshua separat. Sobald der Pfad bekannt ist, diese Spezifikation als `README.md` oder `docs/PRD.md` in das neue Projekt kopieren und dort weiterarbeiten.

Lokale Referenzen im Social-Media-Growth-Workspace:

- Remotion Workflow: `/Users/mojo/Social Media Growth/knowledge-base/tools/remotion.md`
- Operative Video-Pipeline: `/Users/mojo/Social Media Growth/knowledge-base/workflows/codex-remotion-video-pipeline.md`
- B-Roll Library Workflow: `/Users/mojo/Social Media Growth/knowledge-base/workflows/broll-library.md`
- B-Roll Inbox Default Joshua: `/Users/mojo/Social Media Growth/Recordings Social Media.nosync/Broll/_inbox/new_unsorted/`
- B-Roll Indexer: `/Users/mojo/Social Media Growth/content-control-center/scripts/index_broll_library.py`

Eine andere KI soll beim Start im neuen Projekt zuerst diese Datei lesen und danach nur die referenzierten Dateien öffnen, falls sie MojoMakes-/Remotion-Kontext braucht.

## Definition of Done - MVP

- App lässt sich auf macOS und Windows per Doppelklick starten.
- Nutzer kann Speicherort und Dateinamen-Template ohne Code ändern.
- `Handy` exportiert exakt `1080x1920`.
- `Breit` exportiert exakt `1920x1080`.
- `Text groß` exportiert exakt `1080x850`.
- `Normal`, `Text scharf` und `Flüssig` erzeugen sichtbar unterschiedliche FPS/Bitrate-Profile.
- Aufnahme enthält den Rahmen nicht.
- Aufnahme startet erst nach sichtbarem Countdown.
- Export ist H.264 MP4 und in Remotion importierbar.
- FFprobe-Check wird nach jeder Aufnahme angezeigt.
- Auf macOS wird fehlende Screen-Recording-Permission erkannt und verständlich erklärt.
- Auf Windows funktioniert Aufnahme mit Standard-DPI und mindestens einem HiDPI/Scaling-Test.
- Eine 10-Sekunden-Control-Center- oder Website-Aufnahme ist auf Smartphone-Preview lesbar.
- Eine 10-Sekunden-`Breit`-Aufnahme lässt sich in Remotion als Split-Screen/Proof-B-Roll verwenden.
- Fehlerfälle sind verständlich: kein Zugriff, Quelle zu klein, Export fehlgeschlagen, Speicherort nicht beschreibbar.
- Kurze `README` für Joshua und Luisa existiert.

## Definition of Done - Web Capture

- URL kann in Capture-Fenster geöffnet werden.
- Content-Area wird ohne Browser-Toolbar aufgenommen.
- Viewport-Maße stimmen mit Preset.
- Responsive Breakpoints reagieren auf den Content-Viewport.
- Scrollen und Klicken sind im Recording sichtbar.
- Exportmaße stimmen per FFprobe.
- Testseite mit Pixelraster zeigt keine abgeschnittenen Kanten.

## Technische Referenzen

- Electron `desktopCapturer`: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Electron `BrowserWindow` und `setContentBounds`: https://www.electronjs.org/docs/latest/api/browser-window
- MDN `MediaRecorder.videoBitsPerSecond`: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/videoBitsPerSecond
- Playwright Viewport-Referenz für spätere Web-Capture-Tests: https://github.com/microsoft/playwright/blob/main/docs/src/emulation.md
