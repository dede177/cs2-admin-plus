AdminPlus 1.4.1 - AdminPlus-Eintraege im Menue von CS2-SimpleAdmin

Enthaelt Bot-Regel (1.2.0), Karten-Log (1.3.x). Nur die DLL ersetzen, die JSON nicht anfassen.
NUR AdminPlus.dll kopieren, nie die CS2-SimpleAdminApi.dll aus dem Build (die kommt vom Server aus shared/).
Ziel: game/csgo/addons/counterstrikesharp/plugins/AdminPlus/AdminPlus.dll
Vorher die alte DLL als AdminPlus.dll.bak-pre-simpleadmin daneben kopieren.
CounterStrikeSharp laedt die neue DLL von selbst neu. War bekommt nichts.

Wirkung auf Servern MIT CS2-SimpleAdmin (Public, Test):
  !admin oeffnet das graue SimpleAdmin-Menue. Darin gibt es die Kategorie "HSTX Server" mit
  Map und Modus, Einstellungen, Match. Das Chat-Menue von AdminPlus oeffnet sich dann nicht mehr.
Auf Servern OHNE SimpleAdmin (GunGame) bleibt das Chat-Menue wie bisher.

Zurueck zum alten Verhalten: in configs/plugins/AdminPlus/AdminPlus.json
  "UseSimpleAdminMenu": false
oder die alte DLL zurueckkopieren.

Log beim Laden: "AdminPlus: Eintraege im Menue von CS2-SimpleAdmin registriert (3)".
Fehlt die Zeile, steht dort eine Warnung und das Chat-Menue bleibt aktiv.
