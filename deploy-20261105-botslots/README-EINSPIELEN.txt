AdminPlus 1.2.0 - 2 Plätze für Menschen freihalten (Bot-Regel)

Nur die DLL ersetzen, die JSON nicht anfassen (ohne den neuen Schlüssel gilt der Standard 2).
Ziel: game/csgo/addons/counterstrikesharp/plugins/AdminPlus/AdminPlus.dll
Vorher die alte DLL als AdminPlus.dll.bak-pre-botslots daneben kopieren.
CounterStrikeSharp lädt die neue DLL von selbst neu, sonst Neustart.
War bekommt nichts (kein Metamod/CSS).

Regel: Bots dürfen höchstens (Max-Spieler - 2 - Menschen) Plätze belegen. Zu viele Bots werden
gekickt und bot_quota wird abgesenkt. Der GOTV-Bot zählt nicht.
Abschalten oder ändern: in configs/plugins/AdminPlus/AdminPlus.json  "ReservedHumanSlots": 0 (oder 1 bis 8).
Log-Zeile bei Eingriff:  AUDIT admin=0 name="server" action=BotSlots ...
