# AdminPlus Plugin

CounterStrikeSharp plugin that registers all custom `sm_` commands used by the Admin Plus web panel.

## Build

```bash
cd plugin/AdminPlus
dotnet build -c Release
```

The compiled `AdminPlus.dll` will be in `bin/Release/net8.0/`.

## Deploy to Dathost via FTP

1. Connect to your Dathost server via FTP
   - Host: your-server.dathost.net
   - Port: 21 (or as shown in Dathost dashboard)
   - Credentials: from Dathost dashboard → FTP

2. Upload the compiled `AdminPlus.dll` to:
   ```
   game/csgo/addons/counterstrikesharp/plugins/AdminPlus/AdminPlus.dll
   ```

3. Restart the server or run `css_plugins_reload` via RCON

## Registered Commands

All commands are callable via RCON from the web panel:

| Command | Args | Description |
|---|---|---|
| `sm_respawn` | `<userid>` | Respawn a player |
| `sm_setteam` | `<userid> <ct\|t\|spec>` | Move player to team |
| `sm_givemoney` | `<userid> <amount>` | Set player money |
| `sm_givemoney_all` | `<amount>` | Set money for all players |
| `sm_giveweapon` | `<userid> <weapon>` | Give weapon to player |
| `sm_giveweapon_all` | `<weapon>` | Give weapon to all players |
| `sm_sethp` | `<userid> <hp>` | Set player HP |
| `sm_freeze` | `<userid>` | Freeze a player |
| `sm_unfreeze` | `<userid>` | Unfreeze a player |
| `sm_stripweapons` | `<userid>` | Remove all weapons |
| `sm_god` | `<userid>` | Toggle god mode |
| `sm_slap` | `<userid> [damage]` | Slap a player |

## Ingame admin menu

Players with admin flags open the menu with `!admin` (or `/admin`). Entries without permission are hidden, and every action re-checks the permission when it runs. Menu texts are German.

| Area | Actions | Flag |
|---|---|---|
| Spieler | kick, mute, team, slay, respawn | `@css/kick` |
| Spieler | ban (1 hour, 1 day, 7 days, permanent) | `@css/ban` |
| Map und Modus | choose a map pack, change map, change mode | `@css/changemap` |
| Einstellungen | change a whitelisted cvar | `@css/cvar` |
| Einstellungen | load a config from `cfg/hstx/` | `@css/root` |
| Match | pause, resume, end warmup, swap teams | `@css/changemap` |
| Match | restart | `@css/root` |

`@css/root` may do everything. Grant flags in CounterStrikeSharp's `configs/admins.json` and `admin_groups.json`.

Chat menus show six entries per page. Keys 1 to 6 pick an entry, 7 goes back, 8 shows the next page and 9 closes the menu.

Every menu action writes one line to the server log:

```
AUDIT admin=<SteamID64> name="<name>" action=<Action> target="<target>" detail="<value>" result=<ok|denied|target_gone|invalid|error>
```

### Configuration

On first load CounterStrikeSharp creates `configs/plugins/AdminPlus/AdminPlus.json` with the defaults:

- `ConfigDirectory`: folder below `game/csgo/cfg/` whose `*.cfg` files the menu may load (default `hstx`).
- `MenuType`: `chat` or `center`.
- `Cvars`: whitelist of changeable cvars (name, label, category, kind `Bool`/`Int`/`Float`/`Choice`, allowed values). Entries with unsafe names or values, and `sv_cheats`, `rcon_password` and `sv_password`, are dropped at load with a warning in the log.
- `MapPacks`: map packs shown under "Map und Modus" (`Name`, `Label`, `Maps`). Each map has `Name`, `Label` and an optional `WorkshopId` (workshop maps are loaded with `host_workshop_map`). With several packs the menu asks for a pack first, with a single pack it lists the maps directly. The default is one pack "ESL Pool" (Ancient, Anubis, Cache, Dust 2, Inferno, Mirage, Nuke). An example with an ESL and a fun-map pack is in `plugin/AdminPlus/examples/`.
- `Maps` (legacy): the old flat map list. It is still read when `MapPacks` is missing and becomes one pack named `maps`; it is not written again.
- `Modes`: `GameType` and `GameMode` numbers.

Mistakes inside an entry (unknown `Kind`, a number written as `"5"`, an entry of the wrong JSON type) drop only that entry and log a warning; numbers may be written as strings. A **JSON syntax error** (missing bracket, trailing comma) is different: CounterStrikeSharp then refuses to load the whole plugin, including the `sm_*` panel commands, and the error appears in the server console at plugin load. Validate the file after editing it.

Example configs for testing live in `plugin/AdminPlus/examples/cfg-hstx/`. They are not official tournament configs. Copy them to `game/csgo/cfg/hstx/` yourself.

### Panel commands

The `sm_*` commands used by the web panel keep their syntax. They run when called from the server console or over RCON, which is the way the panel uses them. A player who types one into the game console needs `@css/root`; everyone else gets a refusal, and the attempt is written to the log as `AUDIT … action=PanelCommand … result=denied`.

## Tests

```bash
dotnet test plugin/AdminPlus.Tests
```

The tests cover the pure logic in `plugin/AdminPlus/Logic/`. The menu itself needs a running CS2 server with Metamod and CounterStrikeSharp.

## Requirements

- CounterStrikeSharp installed on your CS2 server
- .NET 8 SDK (for building)
