# Ingame-Admin-Menü für AdminPlus: Design

Stand: 2026-10-26 · Status: Entwurf zur Freigabe · Branch: `feat/ingame-admin-menu`

## 1. Ziel

Admins verwalten ihren CS2-Server aus dem laufenden Spiel über ein Menü, das mit `!admin` geöffnet wird. Das Menü ist eine Erweiterung des bestehenden CounterStrikeSharp-Plugins `AdminPlus`. Das Web-Panel und seine `sm_*`-Befehle bleiben nutzbar.

Der Umfang umfasst vier Bereiche:

1. Spieler-Moderation
2. Map und Spielmodus
3. Servereinstellungen (Cvars) und Laden von Server-Configs
4. Match- und Turniersteuerung

Erfolgskriterien:

- Ein Admin mit passendem Recht erledigt alle Aufgaben der vier Bereiche im Spiel, ohne RCON oder Panel.
- Ein Spieler ohne Recht sieht keine Menüpunkte und kann keine Aktion auslösen.
- Jede Menüaktion steht mit Admin-SteamID, Aktion und Ziel im Serverlog.
- Das Verhalten der bestehenden `sm_*`-Befehle für das Web-Panel ändert sich nicht.

## 2. Nicht im ersten Umfang

- **Rollout auf Public, GunGame und War.** Dort laufen Metamod und CounterStrikeSharp nicht. Das Plugin kann dort erst laufen, wenn beides installiert ist. Das ist ein eigener Schritt mit eigener Freigabe.
- **Änderungen am Web-Panel, an Cloudflare oder an den HSTX-Compose-Dateien.** Das Anheben des Pins `CS2ADMIN_COMMIT` in der HSTX-Installation erfolgt erst nach Merge und eigener Freigabe.
- **Ready-Check.** CS2 hat für Community-Server kein eingebautes Ready-System. Ein Plugin-eigenes `!ready` ist eine eigene Funktion und kommt als Folgeschritt, wenn gewünscht.
- **Freie Cvar- oder Pfadeingabe.** Alles kommt aus Auswahllisten.

## 3. Ausgangslage

- `plugin/AdminPlus/AdminPlus.cs` enthält 12 Konsolenbefehle (`sm_respawn`, `sm_setteam`, `sm_givemoney`, `sm_sethp` und weitere) und `sm_playerinfo_all`. Gebaut gegen `CounterStrikeSharp.API 1.0.367`, `net8.0`.
- Keiner der Befehle wertet `caller` aus. Es gibt keine Rechteprüfung. Das war bei reinem RCON-Zugriff durch das Panel unkritisch. Ob ein Spieler diese Befehle heute über seine Client-Konsole auslösen kann, ist **nicht verifiziert** (siehe Abschnitt 11).
- Auf hstx-core hat nur der Test-Server (Port 27106) Metamod, CounterStrikeSharp und `AdminPlus.dll`. Die Dateien liegen unter `game/csgo/addons/counterstrikesharp/`.
- Im Config-Ordner `game/csgo/cfg/` des Test-Servers liegen nur Valve-Standarddateien. Es gibt dort weder `cfg/hstx/` noch eine Turnier-Config.

## 4. Architektur

Alles bleibt **eine Assembly** (`AdminPlus.dll`). Der bestehende Build über `build-plugin.sh` liefert nur diese eine DLL, ein zweites Projekt würde das Deployment ändern.

`AdminPlus` wird eine `partial class` über mehrere Dateien in `plugin/AdminPlus/`:

| Datei | Aufgabe |
|---|---|
| `AdminPlus.cs` | Plugin-Einstieg, Lebenszyklus, Konfiguration laden |
| `PanelCommands.cs` | die bisherigen `sm_*`-Befehle, zeichengleich aus `AdminPlus.cs` verschoben |
| `AdminActions.cs` | die Aktionen des Menüs; die Panel-Befehle bleiben bewusst getrennt, damit ihr Verhalten garantiert gleich bleibt |
| `AdminGate.cs` | zentrale Stelle jeder Menüaktion: Recht prüfen, ausführen, auditieren |
| `Config/AdminPlusConfig.cs` | Plugin-Konfiguration mit Normalisierung |
| `AdminMenu.cs` | Einstieg `!admin`, Hauptmenü, Rechtefilter |
| `Menus/PlayerMenu.cs`, `MapMenu.cs`, `SettingsMenu.cs`, `MatchMenu.cs` | je ein Untermenü |
| `Logic/Permissions.cs` | Zuordnung Menüpunkt zu Flag |
| `Logic/CvarWhitelist.cs` | Whitelist laden, Werte prüfen |
| `Logic/ConfigCatalog.cs` | Config-Dateien im erlaubten Ordner auflisten und prüfen |
| `Logic/Audit.cs` | Format der Logzeile |
| `Logic/ActionResult.cs`, `Logic/ConfigState.cs`, `Logic/GameCommands.cs`, `Logic/Catalog.cs` | Ergebnis einer Aktion, zuletzt geladene Config, Befehlsbau für Kick/Ban/Map/Modus/Match, Standard-Maps und -Modi |

Dateien in `Logic/` verwenden keine CounterStrikeSharp-Typen. Nur sie werden per Unit-Test geprüft.

Menütyp: die eingebauten CounterStrikeSharp-Menüs (Chat- oder Center-HTML-Menü). Keine Community-Bibliothek. Welcher der beiden eingebauten Typen und welche Tastenbelegung genutzt wird, entscheidet sich am Test-Server (Abschnitt 11).

## 5. Rechte

Genutzt wird das CounterStrikeSharp-Adminsystem (`admins.json`, `admin_groups.json`, SteamID64). Jeder Menüpunkt hängt an einem Flag:

| Bereich / Aktion | Flag |
|---|---|
| Hauptmenü `!admin` öffnen | mindestens eines der unten genannten Flags |
| Spieler kicken, muten, Team wechseln, slay, respawn | `@css/kick` |
| Spieler bannen | `@css/ban` |
| Map und Modus wechseln | `@css/changemap` |
| Cvars ändern | `@css/cvar` |
| Config aus `cfg/hstx/` laden | `@css/root` |
| Match pausieren, fortsetzen, Warmup beenden, Teams tauschen | `@css/changemap` |
| Match neu starten | `@css/root` |

`@css/root` erlaubt alles. Die Zuordnung steht in `Permissions.cs` und ist die einzige Stelle, die geändert werden muss.

Zwei Prüfungen, nicht eine:

1. Beim **Aufbau** des Menüs werden Punkte ohne Recht ausgeblendet.
2. Beim **Ausführen** prüft jede Aktion das Recht erneut. Ein Admin, dem das Recht zwischen Öffnen und Auswählen entzogen wird, kann nichts mehr auslösen.

Die bisherigen `sm_*`-Befehle werden so geändert, dass sie nur ausgeführt werden, wenn `caller == null` ist (Server-Konsole und RCON, also der Weg des Web-Panels), sonst nur mit `@css/root`. Das ist die einzige Verhaltensänderung an der Panel-Schnittstelle und sie schließt die Lücke aus Abschnitt 3. Sie wird erst eingebaut, nachdem am Test-Server bestätigt ist, dass RCON-Aufrufe `caller == null` liefern (Abschnitt 11).

## 6. Menüs

Hauptmenü, jeweils nur mit vorhandenem Recht sichtbar: Spieler, Map und Modus, Einstellungen, Match, Schließen.

### 6.1 Spieler

Spieler aus der Liste wählen, danach: Kicken, Bannen, Muten, Team wechseln, Slay, Respawn. Das Ziel wird beim Auswählen als `UserId` gemerkt und **bei der Ausführung neu gesucht**. Ist der Spieler gegangen, erscheint „Spieler nicht mehr auf dem Server" und es passiert nichts.

Das Menü erlaubt es nicht, sich selbst oder einen Spieler mit höherer Admin-Stufe zu kicken oder zu bannen.

### 6.2 Map und Modus

- Maps aus der Plugin-Konfiguration (Name und optional Workshop-ID).
- Spielmodus: Competitive, Wingman, Casual, Deathmatch.

### 6.3 Einstellungen

**Cvars.** Kategorien: Runden, Wirtschaft, Regeln, Warmup, Bots. Jede Cvar hat in der Whitelist:

- technischer Name und Anzeigename
- Kategorie
- Typ `bool`, `int`, `float` oder `choice`
- erlaubte Werte (`choice`) oder `min`, `max`, `step` (Zahlen)

Ein Admin wählt Cvar und dann einen der angebotenen Werte. Es gibt keine freie Eingabe. Die Whitelist liegt in der Plugin-Konfiguration und kann ohne Neubau erweitert werden.

Startumfang, **Namen werden vor der Umsetzung gegen den Test-Server geprüft** (CS2 benennt Cvars gelegentlich um):

| Kategorie | Cvars |
|---|---|
| Runden | `mp_roundtime`, `mp_roundtime_defuse`, `mp_freezetime`, `mp_maxrounds`, `mp_c4timer` |
| Wirtschaft | `mp_startmoney`, `mp_buytime`, `mp_afterroundmoney` |
| Regeln | `mp_friendlyfire`, `mp_autoteambalance`, `mp_limitteams`, `mp_overtime_enable`, `sv_alltalk` |
| Warmup | `mp_warmuptime`, `mp_warmup_pausetimer` |
| Bots | `bot_quota`, `bot_difficulty` |

Nicht in der Whitelist und damit nicht änderbar: `sv_cheats`, `rcon_password`, `sv_password`, alles mit Zugangsdaten oder Cheat-Wirkung.

**Configs laden.** Der Admin lädt eine auf dem Server liegende Config:

- Es wird nur der Ordner `game/csgo/cfg/hstx/` gelesen, und nur Dateien mit der Endung `.cfg`.
- `ConfigCatalog` baut die Liste beim Öffnen des Menüs neu auf. Eine neu abgelegte Datei erscheint ohne Neustart.
- Gewählt wird nur aus dieser Liste. Es gibt keine Eingabe eines Dateinamens oder Pfads. Dateinamen mit `..`, `/`, `\` oder Laufwerksangabe werden abgelehnt, auch wenn sie je in die Liste gelangen würden.
- Geladen wird per `exec hstx/<name>`.
- Das Menü merkt sich die **zuletzt geladene Config** und zeigt sie oben an. Ändert jemand danach eine Cvar, steht dort zusätzlich „manuell geändert". Eine später geladene Config überschreibt manuelle Änderungen, das ist gewolltes Verhalten.
- Recht: `@css/root`.

Damit sind beide Wege möglich: Cvars manuell einstellen, bevor oder nachdem eine Turnier-Config wie `esl5on5.cfg` geladen wird, oder die Config direkt laden.

### 6.4 Match

Pause, Fortsetzen, Warmup beenden, Teams tauschen, Neustart. Umgesetzt mit den eingebauten Befehlen `mp_pause_match`, `mp_unpause_match`, `mp_warmup_end`, `mp_swapteams`, `mp_restartgame`. Es gibt keine Abhängigkeit zu einem weiteren Plugin. Namen und Verhalten werden am Test-Server bestätigt.

## 7. Audit

Jede Aktion, die das Menü auslöst, schreibt eine Zeile ins Serverlog über den Plugin-Logger:

```
AUDIT admin=<SteamID64> name=<Name> action=<aktion> target=<ziel> detail=<wert>
```

Auch abgelehnte Versuche (fehlendes Recht, Ziel nicht gefunden) werden mit `result=denied` bzw. `result=target_gone` protokolliert. Das schließt die Lücke „kein Befehls-Audit" aus der HSTX-Dokumentation für Aktionen im Spiel. Aktionen über das Web-Panel sind davon nicht betroffen.

## 8. Konfiguration

Eine Datei `AdminPlus.json` im Plugin-Konfigurationsordner von CounterStrikeSharp. Sie enthält:

- `ConfigDirectory` (Standard `hstx`)
- Cvar-Whitelist (Abschnitt 6.3)
- Map-Pakete (`MapPacks`, je Paket eine Map-Liste mit optionaler Workshop-ID); der alte Schlüssel `Maps` wird weiter gelesen und zu einem Paket
- Spielmodi mit den zugehörigen Cvars

Fehlt die Datei, legt das Plugin Standardwerte an. Einzelne ungültige Einträge (unbekannter `Kind`, falscher JSON-Typ, verbotener Name) werden verworfen und je mit einer Logzeile gemeldet; der Rest funktioniert. Zahlen dürfen auch als Zeichenkette stehen. Ist die Datei dagegen **syntaktisch** ungültig, lädt CounterStrikeSharp das Plugin gar nicht, auch die Panel-Befehle fehlen dann. Das Plugin kann das nicht abfangen, weil die Konfiguration vor `Load` außerhalb jeder Fehlerbehandlung gelesen wird; die README weist darauf hin.

## 9. Fehlerverhalten

- Ziel weg, Recht fehlt, ungültiger Wert: kurze Meldung an den Admin im Chat, Eintrag im Audit, keine Aktion.
- Eine Aktion, die eine Ausnahme wirft, wird abgefangen, im Log gemeldet und bringt den Server nicht zum Absturz.
- Menüs sind pro Admin getrennt. Zwei Admins gleichzeitig stören sich nicht.

## 10. Tests

**Unit-Tests** (xUnit, neues Projekt `plugin/AdminPlus.Tests`, ohne laufendes Spiel) für alles in `Logic/`:

- Rechte-Zuordnung, einschließlich `@css/root` als Alles-Recht
- Cvar-Whitelist: gültige und ungültige Werte, Grenzen, unbekannte Cvars, verbotene Cvars
- Config-Katalog: nur `.cfg` im erlaubten Ordner, Ablehnung von `..`, absoluten Pfaden, Unterordnern und anderen Endungen
- Audit-Format

**Interaktiv am Test-Server (Port 27106)**, mit mindestens zwei Konten: eines mit Moderator-Flags, eines mit `@css/root`.

- Menüpunkte je Rolle sichtbar bzw. unsichtbar
- jede Aktion einmal ausgeführt und im Spiel sowie im Log geprüft
- Config aus `cfg/hstx/` laden, danach eine Cvar ändern, Anzeige „manuell geändert"
- Panel-Befehle laufen weiterhin über RCON

Beispiel-Configs für Tests liegen im Repo unter `plugin/AdminPlus/examples/cfg-hstx/`. Es wird nichts automatisch auf einen Server kopiert.

## 11. Zu verifizieren (am Test-Server, vor der jeweiligen Umsetzung)

1. Können normale Spieler heute `sm_*`-Befehle über ihre Client-Konsole auslösen?
2. Liefert ein RCON-Aufruf `caller == null`?
3. Welcher eingebaute Menütyp läuft mit CounterStrikeSharp 1.0.367 am besten und welche Tasten gelten?
4. Exakte Cvar-Namen und Wertebereiche der Whitelist (`cvarlist`).
5. Ban: Wirkt `banid` in CS2 und bleibt der Ban nach einem Neustart bestehen (`writeid`)?
6. Mute: Funktioniert das Stummschalten per Voice-Flag zuverlässig?
7. Moduswechsel: Welche Kombination aus Cvars und Map-Neuladen schaltet den Modus korrekt um?

Kann ein Punkt nicht umgesetzt werden, wird die Funktion im Menü ausgelassen und hier vermerkt, nicht stillschweigend ersetzt.

## 12. Rollout

1. Entwicklung und Test auf dem Test-Server, Bau mit `build-plugin.sh`, Laden mit `css_plugins load AdminPlus`.
2. Pull Request in `dede177/cs2-admin-plus`.
3. Nach Merge: Pin `CS2ADMIN_COMMIT` in der HSTX-Installation anheben. Das ändert Server und erfolgt nur nach ausdrücklicher Freigabe.
4. Produktivserver: erst Metamod und CounterStrikeSharp installieren, dann Plugin. Eigener Schritt, eigene Freigabe.

## 13. Risiken

- **CS2-Updates** können CounterStrikeSharp-Versionen oder Cvar-Namen brechen. Gegenmaßnahme: Whitelist in der Konfiguration, Prüfung der Namen beim Start mit Logwarnung.
- **Admin-Missbrauch** ist durch Audit nachvollziehbar, nicht verhindert. Rollen sollten klein gehalten werden.
- **OneDrive-Ordner:** Das Arbeitsrepo liegt in einem synchronisierten Ordner. `.git` und `node_modules` können Sync-Probleme verursachen.
