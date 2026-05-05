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

## Requirements

- CounterStrikeSharp installed on your CS2 server
- .NET 8 SDK (for building)
