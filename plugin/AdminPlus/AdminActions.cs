using AdminPlus.Logic;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

/// <summary>Actions triggered by the ingame menu. The panel's sm_ commands are separate and unchanged.</summary>
internal static class AdminActions
{
    public static CCSPlayerController? Find(int userId) =>
        Utilities.GetPlayers().FirstOrDefault(p => p.IsValid && !p.IsBot && p.UserId == userId);

    public static IEnumerable<CCSPlayerController> HumanPlayers() =>
        Utilities.GetPlayers().Where(p => p.IsValid && !p.IsBot && p.UserId.HasValue);

    public static ActionResult Respawn(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.Respawn();
        return ActionResult.Ok($"{player.PlayerName} respawnt.");
    }

    public static ActionResult SwitchTeam(int userId, CsTeam team, string teamLabel)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.SwitchTeam(team);
        return ActionResult.Ok($"{player.PlayerName} ist jetzt {teamLabel}.");
    }

    public static ActionResult Slay(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.CommitSuicide(false, true);
        return ActionResult.Ok($"{player.PlayerName} wurde getötet.");
    }

    public static ActionResult ToggleMute(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        bool muted = (player.VoiceFlags & VoiceFlags.Muted) != 0;
        player.VoiceFlags = muted ? VoiceFlags.Normal : VoiceFlags.Muted;
        return ActionResult.Ok($"{player.PlayerName} ist {(muted ? "nicht mehr gemutet" : "gemutet")}.");
    }

    public static ActionResult Kick(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        Server.ExecuteCommand(ModerationCommands.Kick(userId));
        return ActionResult.Ok($"{player.PlayerName} wurde gekickt.");
    }

    public static ActionResult Ban(int userId, int minutes)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();
        if (!ModerationCommands.TryBan(userId, minutes, out var commands))
            return ActionResult.Invalid("Ungültige Banndauer.");

        var name = player.PlayerName;
        foreach (var command in commands) Server.ExecuteCommand(command);
        return ActionResult.Ok($"{name} wurde gebannt ({(minutes == 0 ? "permanent" : $"{minutes} Min")}).");
    }

    public static ActionResult ChangeMap(MapEntry map)
    {
        if (!MapCommands.TryBuild(map, out var command))
            return ActionResult.Invalid("Ungültiger Map-Eintrag.");

        Server.ExecuteCommand(command);
        return ActionResult.Ok($"Mapwechsel auf {map.Label}.");
    }

    /// <summary>Laedt das Paket; mit firstMap startet es mit dieser Karte (sonst zufaellig).</summary>
    public static ActionResult LoadPack(MapPack pack, MapEntry? firstMap = null)
    {
        if (!MapCommands.TryBuildCycle(pack.Cycle, out var command, firstMap?.Name))
            return ActionResult.Invalid("Dieses Paket hat keine Kartenrotation oder die Karte ist ungültig.");

        Server.ExecuteCommand(command);
        return ActionResult.Ok(firstMap == null ? $"Paket {pack.Label} wird geladen." : $"Paket {pack.Label} wird geladen, Start mit {firstMap.Label}.");
    }

    public static ActionResult ChangeMode(ModeDefinition mode)
    {
        if (!MapCommands.TryBuildMode(mode, Server.MapName, out var commands))
            return ActionResult.Invalid("Moduswechsel nur auf einer normalen Map möglich. Erst eine Map wählen.");

        foreach (var command in commands) Server.ExecuteCommand(command);
        return ActionResult.Ok($"Modus {mode.Label}, Map wird neu geladen.");
    }

    public static ActionResult SetCvar(IEnumerable<CvarDefinition> defs, string name, string value, ConfigState state)
    {
        if (!CvarWhitelist.TryBuildCommand(defs, name, value, out var command, out var error))
            return ActionResult.Invalid(error);

        Server.ExecuteCommand(command);
        state.MarkCvarChanged();
        return ActionResult.Ok($"{name} = {value}");
    }

    public static ActionResult LoadConfig(string directory, string folder, string name, ConfigState state)
    {
        if (!ConfigCatalog.TryResolve(directory, folder, name, out var command))
            return ActionResult.Invalid("Config nicht gefunden.");

        Server.ExecuteCommand(command);
        state.MarkLoaded(name);
        return ActionResult.Ok($"Config {name} geladen.");
    }

    public static ActionResult Match(MenuAction action, string label)
    {
        var command = MatchCommands.For(action);
        if (command == null) return ActionResult.Invalid("Unbekannte Match-Aktion.");

        Server.ExecuteCommand(command);
        return ActionResult.Ok($"{label}.");
    }
}
