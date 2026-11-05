# Plugin- und Fehlerprüfung Test, GunGame, Public (5.11.2026, ca. 20:35 MEZ)

Geprüft: CounterStrikeSharp-Log (`log-all20261105.txt`), Container-Log, Hub-Status, Panel-Logs, Plugin-DLLs.

## 1. Plugin-Status

| Plugin | Test | GunGame | Public |
|---|---|---|---|
| AdminPlus | läuft, 1.2.0 (Bot-Regel, 06fe3bd3) | läuft, alt (30652998) | läuft, alt (30652998) |
| HstxAdminMode 1.2.1 | läuft | läuft | läuft |
| HstxMapRotation | läuft (1.0.0, `rotation.txt`) | läuft (1.1.0, ESL-Liste) | nicht installiert |
| RockTheVote | läuft | läuft | läuft |
| HstxSkillMod 1.0.0 | läuft (13 Trainingskarten) | nicht installiert | nicht installiert |
| Metamod + CounterStrikeSharp | geladen | geladen | geladen |

Alle Plugins haben beim letzten Start `Finished loading` gemeldet. Es gibt keine Exceptions, keine `[ERR]`, keine `[FTL]`.

## 2. Befunde

| Nr | Befund | Server | Schwere | Ursache | Stand |
|---|---|---|---|---|---|
| F1 | GunGame 20/20 Plätze belegt, 18 Bots (nach `bot_quota 20` um 19:43) | GunGame | hoch | alte AdminPlus-DLL ohne Bot-Regel, Menschen kommen nicht mehr rein | offen, braucht DLL-Einspielung |
| F2 | RockTheVote-Warnung `SoundVolume` bei jedem Start | alle | niedrig | `Rtv.SoundVolume` 0.5 mit Sound-Pfad statt Hash | Config korrigiert, wirkt auf Test (nachgeprüft), auf GunGame/Public erst nach Neuladen |
| F3 | `admins.json` wird nur beim Start gelesen: Test und Public kennen `the-great-one` noch nicht (1 Admin geladen) | Test, Public | mittel | CounterStrikeSharp liest die Datei einmalig | offen, `css_reload_admins` nötig |
| F4 | AdminPlus-Bot-Regel (1.2.0) nur auf Test | GunGame, Public | mittel | DLL nicht eingespielt | offen |
| F5 | Panel Public/Test: keine PlayerInfo-Antworten in 60 Min | Test, Public | keine | Panel fragt nur bei offener Weboberfläche ab (GunGame: 110 Antworten) | kein Fehler |
| F6 | Standardmeldungen: `Unknown command` aus `cfg/gamemode_*.cfg`, Steam-API, fehlende Lightmaps | alle | keine | Valve-Dateien/Umgebung | nicht änderbar |
| F7 | `kRenderTransColor` (4388 Zeilen) | Test | niedrig | Entity-Wert in einer Trainings-Map | nur durch Mapwechsel/Map-Fix |
| F8 | HstxMapRotation `keine Kartenliste` um 19:27 | GunGame | erledigt | Plugin-Stand vor dem Update 19:45; danach Rotation Ancient → Anubis ok | behoben |

## 3. Änderungen heute
- GunGame: Mapgroup `mg_hstx_gg2` und `maplist.txt` auf die 7 ESL-Maps (Backups `*.bak-pool30-20261105`).
- `admins.json` Public/GunGame/Test: `the-great-one` ergänzt (Backups `*.bak-20261105`).
- `RockTheVote.json` Public/GunGame/Test: `Rtv.SoundVolume` 1 (Backups `*.bak-rtvsound-20261105`).
- Test: AdminPlus 1.2.0 (Backup `AdminPlus.dll.bak-pre-botslots`).

## 4. Nachtrag 20:51 MEZ (auf Anweisung des Nutzers)
- F1/F4 behoben: AdminPlus 1.2.0 (06fe3bd3) auf GunGame und Public eingespielt (Backup `AdminPlus.dll.bak-pre-botslots`). Hot-Reload ohne Fehler. GunGame: 20:50:45 `AUDIT … action=BotSlots … humans=1 max=20 reserved=2 result=ok`, danach Hub 17/20, `kickid` wirkt bei Bots.
- F2 behoben: RockTheVote auf GunGame und Public neu geladen, keine Warnung mehr.

## 5. Offen
1. Test und Public (F3): `css_rcon css_reload_admins`, damit `the-great-one` aktiv wird.
