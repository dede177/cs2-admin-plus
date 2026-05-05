using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

public class AdminPlus : BasePlugin
{
    public override string ModuleName        => "AdminPlus";
    public override string ModuleVersion     => "1.0.0";
    public override string ModuleAuthor      => "dede177";
    public override string ModuleDescription => "Web admin panel command bridge";

    public override void Load(bool hotReload)
    {
        Console.WriteLine("[AdminPlus] ✅ Loaded — all sm_ commands registered.");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private CCSPlayerController? FindPlayer(string useridStr)
    {
        if (!int.TryParse(useridStr, out int userid)) return null;
        return Utilities.GetPlayers()
            .FirstOrDefault(p => p.IsValid && !p.IsBot && p.UserId == userid);
    }

    private void Reply(CommandInfo info, string msg)
    {
        Console.WriteLine($"[AdminPlus] {msg}");
        info.ReplyToCommand($"[AdminPlus] {msg}");
    }

    // ─── sm_playerinfo_all ───────────────────────────────────────────────────
    // Returns one line per player: userid|name|team|hp|money|alive
    // Called by the backend every poll instead of "status"

    [ConsoleCommand("sm_playerinfo_all", "Dump all player info for the web panel")]
    public void OnPlayerInfoAll(CCSPlayerController? caller, CommandInfo info)
    {
        var players = Utilities.GetPlayers().Where(p => p.IsValid && !p.IsBot);
        foreach (var player in players)
        {
            var pawn   = player.PlayerPawn.Value;
            int hp     = pawn?.Health ?? 0;
            bool alive = pawn?.LifeState == (byte)LifeState_t.LIFE_ALIVE;

            string team = player.TeamNum switch
            {
                (byte)CsTeam.CounterTerrorist => "ct",
                (byte)CsTeam.Terrorist        => "t",
                (byte)CsTeam.Spectator        => "spec",
                _                             => "none"
            };

            int money = player.InGameMoneyServices?.Account ?? 0;

            info.ReplyToCommand($"PLAYERINFO:{player.UserId}|{player.PlayerName}|{team}|{hp}|{money}|{(alive ? "1" : "0")}");
        }
        info.ReplyToCommand("PLAYERINFO:END");
    }

    // ─── sm_respawn ───────────────────────────────────────────────────────────

    [ConsoleCommand("sm_respawn", "Respawn a player")]
    public void OnRespawn(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_respawn <userid>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }
        player.Respawn();
        Reply(info, $"Respawned {player.PlayerName}");
    }

    // ─── sm_setteam ───────────────────────────────────────────────────────────

    [ConsoleCommand("sm_setteam", "Move a player to a team")]
    public void OnSetTeam(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 3) { Reply(info, "Usage: sm_setteam <userid> <ct|t|spec>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        CsTeam team = info.ArgByIndex(2).ToLower() switch
        {
            "ct"   => CsTeam.CounterTerrorist,
            "t"    => CsTeam.Terrorist,
            "spec" => CsTeam.Spectator,
            _      => CsTeam.None
        };

        if (team == CsTeam.None) { Reply(info, "Invalid team. Use: ct, t, spec"); return; }
        player.SwitchTeam(team);
        Reply(info, $"Moved {player.PlayerName} to {team}");
    }

    // ─── Money helper (forces immediate network replication) ──────────────────

    private void SetMoney(CCSPlayerController player, int amount)
    {
        var ms = player.InGameMoneyServices;
        if (ms == null) return;
        ms.Account = Math.Clamp(amount, 0, 65535);
        Utilities.SetStateChanged(player, "CCSPlayerController", "m_pInGameMoneyServices");
    }

    // ─── sm_givemoney ─────────────────────────────────────────────────────────

    [ConsoleCommand("sm_givemoney", "Set a player's money")]
    public void OnGiveMoney(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 3) { Reply(info, "Usage: sm_givemoney <userid> <amount>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }
        if (!int.TryParse(info.ArgByIndex(2), out int amount)) { Reply(info, "Invalid amount"); return; }

        if (player.InGameMoneyServices == null) { Reply(info, "Money services unavailable"); return; }
        SetMoney(player, amount);
        Reply(info, $"Set {player.PlayerName} money to ${amount}");
    }

    // ─── sm_givemoney_all ─────────────────────────────────────────────────────

    [ConsoleCommand("sm_givemoney_all", "Set money for all players")]
    public void OnGiveMoneyAll(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_givemoney_all <amount>"); return; }
        if (!int.TryParse(info.ArgByIndex(1), out int amount)) { Reply(info, "Invalid amount"); return; }

        amount = Math.Clamp(amount, 0, 65535);
        int count = 0;
        foreach (var player in Utilities.GetPlayers().Where(p => p.IsValid && !p.IsBot))
        {
            if (player.InGameMoneyServices == null) continue;
            SetMoney(player, amount);
            count++;
        }
        Reply(info, $"Set money to ${amount} for {count} players");
    }

    // ─── sm_giveweapon ────────────────────────────────────────────────────────

    [ConsoleCommand("sm_giveweapon", "Give a weapon to a player")]
    public void OnGiveWeapon(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 3) { Reply(info, "Usage: sm_giveweapon <userid> <weapon_name>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        string weapon = info.ArgByIndex(2);
        if (!weapon.StartsWith("weapon_")) weapon = $"weapon_{weapon}";
        player.GiveNamedItem(weapon);
        Reply(info, $"Gave {weapon} to {player.PlayerName}");
    }

    // ─── sm_giveweapon_all ────────────────────────────────────────────────────

    [ConsoleCommand("sm_giveweapon_all", "Give a weapon to all players")]
    public void OnGiveWeaponAll(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_giveweapon_all <weapon_name>"); return; }
        string weapon = info.ArgByIndex(1);
        if (!weapon.StartsWith("weapon_")) weapon = $"weapon_{weapon}";

        int count = 0;
        foreach (var player in Utilities.GetPlayers().Where(p => p.IsValid && !p.IsBot && p.PawnIsAlive))
        {
            player.GiveNamedItem(weapon);
            count++;
        }
        Reply(info, $"Gave {weapon} to {count} players");
    }

    // ─── sm_sethp ────────────────────────────────────────────────────────────

    [ConsoleCommand("sm_sethp", "Set a player's HP")]
    public void OnSetHp(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 3) { Reply(info, "Usage: sm_sethp <userid> <amount>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }
        if (!int.TryParse(info.ArgByIndex(2), out int hp)) { Reply(info, "Invalid hp value"); return; }

        var pawn = player.PlayerPawn.Value;
        if (pawn == null) { Reply(info, "Player pawn not found"); return; }

        pawn.Health = Math.Clamp(hp, 1, 500);
        Utilities.SetStateChanged(pawn, "CBaseEntity", "m_iHealth");
        Reply(info, $"Set {player.PlayerName} HP to {hp}");
    }

    // ─── sm_freeze ───────────────────────────────────────────────────────────

    [ConsoleCommand("sm_freeze", "Freeze a player")]
    public void OnFreeze(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_freeze <userid>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        var pawn = player.PlayerPawn.Value;
        if (pawn == null) { Reply(info, "Player pawn not found"); return; }

        pawn.MoveType = MoveType_t.MOVETYPE_OBSOLETE;
        Utilities.SetStateChanged(pawn, "CBaseEntity", "m_MoveType");
        Reply(info, $"Froze {player.PlayerName}");
    }

    // ─── sm_unfreeze ─────────────────────────────────────────────────────────

    [ConsoleCommand("sm_unfreeze", "Unfreeze a player")]
    public void OnUnfreeze(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_unfreeze <userid>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        var pawn = player.PlayerPawn.Value;
        if (pawn == null) { Reply(info, "Player pawn not found"); return; }

        pawn.MoveType = MoveType_t.MOVETYPE_WALK;
        Utilities.SetStateChanged(pawn, "CBaseEntity", "m_MoveType");
        Reply(info, $"Unfroze {player.PlayerName}");
    }

    // ─── sm_stripweapons ─────────────────────────────────────────────────────

    [ConsoleCommand("sm_stripweapons", "Remove all weapons from a player")]
    public void OnStripWeapons(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_stripweapons <userid>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }
        player.RemoveWeapons();
        Reply(info, $"Stripped weapons from {player.PlayerName}");
    }

    // ─── sm_god ──────────────────────────────────────────────────────────────

    [ConsoleCommand("sm_god", "Toggle god mode on a player")]
    public void OnGod(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_god <userid>"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        var pawn = player.PlayerPawn.Value;
        if (pawn == null) { Reply(info, "Player pawn not found"); return; }

        pawn.TakesDamage = !pawn.TakesDamage;
        Utilities.SetStateChanged(pawn, "CBaseEntity", "m_bTakesDamage");
        Reply(info, $"{(pawn.TakesDamage ? "Disabled" : "Enabled")} god mode for {player.PlayerName}");
    }

    // ─── sm_slap ─────────────────────────────────────────────────────────────

    [ConsoleCommand("sm_slap", "Slap a player for optional damage")]
    public void OnSlap(CCSPlayerController? caller, CommandInfo info)
    {
        if (info.ArgCount < 2) { Reply(info, "Usage: sm_slap <userid> [damage]"); return; }
        var player = FindPlayer(info.ArgByIndex(1));
        if (player == null) { Reply(info, "Player not found"); return; }

        int damage = 0;
        if (info.ArgCount >= 3) int.TryParse(info.ArgByIndex(2), out damage);

        var pawn = player.PlayerPawn.Value;
        if (pawn == null) { Reply(info, "Player pawn not found"); return; }

        if (damage > 0)
        {
            pawn.Health = Math.Max(1, pawn.Health - damage);
            Utilities.SetStateChanged(pawn, "CBaseEntity", "m_iHealth");
        }

        var rng = new Random();
        var vel = pawn.AbsVelocity;
        vel.X += (float)(rng.NextDouble() * 400 - 200);
        vel.Y += (float)(rng.NextDouble() * 400 - 200);
        vel.Z += 200;

        Reply(info, $"Slapped {player.PlayerName} for {damage} damage");
    }
}
