AdminPlus 1.3.0 - Kartenwechsel und css_rcon im Log

Enthält auch die Bot-Regel aus 1.2.0. Nur die DLL ersetzen, die JSON nicht anfassen.
Ziel: game/csgo/addons/counterstrikesharp/plugins/AdminPlus/AdminPlus.dll
Vorher die alte DLL als AdminPlus.dll.bak-pre-mapcmdlog daneben kopieren.
CounterStrikeSharp lädt die neue DLL von selbst neu, sonst Neustart. War bekommt nichts.

Neu: Jeder Kartenwechsel per css_map, css_changemap, css_wsmap, css_rcon, !map, /changemap,
changelevel, map, host_workshop_map schreibt eine Zeile ins Log:
  AUDIT admin=<SteamID64 oder 0 für die Server-Konsole> ... action=MapCommand ... detail="css_map de_inferno"
Passwörter in den Argumenten werden durch [verborgen] ersetzt.
