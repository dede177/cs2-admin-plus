AdminPlus mit Map-Paketen einspielen (Stand 2026-11-01)
==========================================================

Was drin ist
  AdminPlus.dll               neue Version (ESL Pool + GunGame Fun-Maps im Menue), 59392 Bytes
  test/AdminPlus.json         fertige Konfiguration fuer den Test-Server   (Port 27106)
  public/AdminPlus.json       fertige Konfiguration fuer den Public-Server (Port 27100)
  gungame/AdminPlus.json      fertige Konfiguration fuer den GunGame-Server (Port 27102)

  Gegenueber der laufenden Datei ist nur ein Block anders: der alte Schluessel "Maps"
  wurde durch "MapPacks" ersetzt (zwei Pakete: ESL Pool mit 7 Maps, GunGame Fun-Maps mit
  22 Workshop-Maps). Cvars, Modes, MenuType und ConfigDirectory sind unveraendert.

War-Server: NICHT anfassen (kein Metamod, kein Plugin).

Reihenfolge pro Server (Test, Public, GunGame; immer erst DLL und Datei, dann laden)
  1. Pterodactyl -> Server oeffnen -> Konsole:   css_plugins unload AdminPlus
  2. Dateimanager -> game/csgo/addons/counterstrikesharp/plugins/AdminPlus/
       AdminPlus.dll duplizieren als AdminPlus.dll.bak-pre-packs
       neue AdminPlus.dll hochladen (ueberschreiben)
  3. Dateimanager -> game/csgo/addons/counterstrikesharp/configs/plugins/AdminPlus/
       AdminPlus.json duplizieren als AdminPlus.json.bak-pre-packs
       die AdminPlus.json aus dem passenden Ordner (test / public / gungame) hochladen
  4. Konsole:   css_plugins load AdminPlus

Erwartet
  Konsole:  [AdminPlus] Loaded ...   und KEINE Zeile mit "AdminPlus config"
  Im Spiel: !admin -> "Map und Modus" zeigt  "Paket: ESL Pool (7)"  und
            "Paket: GunGame Fun-Maps (22)", darunter die Modi.
            Ein Paket oeffnet seine Maps (sechs pro Seite, 8 = weiter, 7 = zurueck).

Achtung
  - Wichtig: DLL UND Datei zusammen einspielen. Eine neue Datei mit der alten DLL wuerde
    "MapPacks" ignorieren, eine neue DLL mit der alten Datei zeigt weiter die alte Map-Liste
    als Paket "Maps".
  - Ein Syntaxfehler in der JSON laesst das ganze Plugin nicht laden (auch die sm_*-Befehle
    des Web-Panels). Die Dateien hier sind geprueft, aber nicht von Hand aendern ohne Pruefung.
  - Der Moduswechsel laedt die aktuelle Map neu und geht nur auf normalen Maps. Auf GunGame
    laeuft meist eine Workshop-Map, dort wird "Modus: ..." mit einer Meldung abgelehnt.
  - Workshop-Maps im Paket "GunGame Fun-Maps" werden mit host_workshop_map geladen; sie
    muessen auf dem Server schon heruntergeladen oder abrufbar sein.

Zurueck
  Konsole:   css_plugins unload AdminPlus
  Beide .bak-pre-packs-Dateien wieder auf die Originalnamen kopieren, dann
             css_plugins load AdminPlus

Pruefsumme der DLL (SHA-256)
  30652998439f39c0ec35cb38833aca6a5a8bab4210f773bd1c16bdb87bbb8986
  Der Test-Server hat einen Sicherungsstand der Konfiguration:
  game/csgo/addons/counterstrikesharp/configs/plugins/AdminPlus/AdminPlus.json.bak-20261101
  (nicht ueberschreiben, deshalb heisst die neue Sicherung bak-pre-packs).

Nicht committen: dieser Ordner ist nur zum Einspielen gedacht.
