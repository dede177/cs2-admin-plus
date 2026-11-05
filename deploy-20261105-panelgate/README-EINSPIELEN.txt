AdminPlus mit abgesicherten Panel-Befehlen einspielen (Stand 2026-11-05)
==========================================================================

Was drin ist
  AdminPlus.dll   59392 -> 60416 Bytes, SHA-256 beginnt mit 6e59ec5b
                  Die 13 sm_*-Befehle des Web-Panels laufen nur ueber Server-Konsole/RCON
                  oder mit @css/root. Cvars, Map-Pakete usw. (AdminPlus.json) bleiben unveraendert.

Nur die DLL tauschen. Die AdminPlus.json NICHT anfassen.

Pro Server (Public und GunGame; Test ist schon umgestellt, War nicht anfassen)
  1. Pterodactyl -> Server oeffnen -> Dateimanager ->
       game/csgo/addons/counterstrikesharp/plugins/AdminPlus/
  2. AdminPlus.dll duplizieren als  AdminPlus.dll.bak-pre-panelgate
  3. Neue AdminPlus.dll hochladen (ueberschreiben).
     CounterStrikeSharp laedt das Plugin beim Ueberschreiben von selbst neu.
     Wenn nicht: Server neu starten.

Erwartet
  Konsole: "[AdminPlus] Loaded", keine Zeile mit "AdminPlus config".
  Panel des Servers (cs2-public / cs2-gungame .hardstylistixx.de) zeigt weiter die Spielerliste.

Zurueck
  AdminPlus.dll.bak-pre-panelgate wieder auf AdminPlus.dll kopieren.

Nicht committen: dieser Ordner ist nur zum Einspielen gedacht.
