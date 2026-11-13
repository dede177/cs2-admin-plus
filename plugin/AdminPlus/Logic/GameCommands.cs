using System.Globalization;
using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public static class ModerationCommands
{
    public const int MaxBanMinutes = 525600;

    public static string Kick(int userId) => $"kickid {userId.ToString(CultureInfo.InvariantCulture)}";

    public static bool TryBan(int userId, int minutes, out string[] commands)
    {
        commands = Array.Empty<string>();
        if (minutes < 0 || minutes > MaxBanMinutes) return false;

        var id = userId.ToString(CultureInfo.InvariantCulture);
        var min = minutes.ToString(CultureInfo.InvariantCulture);
        commands = new[] { $"banid {min} {id} kick", "writeid" };
        return true;
    }
}

public static class MapCommands
{
    private static readonly Regex MapRx = new(@"^[a-z0-9_]{1,64}\z", RegexOptions.CultureInvariant);
    private static readonly Regex WorkshopRx = new(@"^[0-9]{1,20}\z", RegexOptions.CultureInvariant);

    private static readonly Regex CycleRx = new(@"^[a-z0-9_]{1,24}\z", RegexOptions.CultureInvariant);

    public static bool IsValidMapName(string? name) => name != null && MapRx.IsMatch(name);

    public static bool IsValidCycleName(string? name) => name != null && CycleRx.IsMatch(name);

    /// <summary>Befehl des Plugins HstxMapRotation: laedt ein Paket, danach laeuft nur dessen Kartenrotation.</summary>
    public static bool TryBuildCycle(string? cycle, out string command)
    {
        command = "";
        if (!IsValidCycleName(cycle)) return false;
        command = $"css_party pack {cycle}";
        return true;
    }

    public static bool TryBuild(MapEntry map, out string command)
    {
        command = "";

        if (!string.IsNullOrEmpty(map.WorkshopId))
        {
            if (!WorkshopRx.IsMatch(map.WorkshopId)) return false;
            command = $"host_workshop_map {map.WorkshopId}";
            return true;
        }

        if (!IsValidMapName(map.Name)) return false;
        command = $"changelevel {map.Name}";
        return true;
    }

    public static bool TryBuildMode(ModeDefinition mode, string currentMap, out string[] commands)
    {
        commands = Array.Empty<string>();
        if (mode.GameType is < 0 or > 9 || mode.GameMode is < 0 or > 9) return false;
        if (!IsValidMapName(currentMap)) return false;

        commands = new[]
        {
            $"game_type {mode.GameType.ToString(CultureInfo.InvariantCulture)}",
            $"game_mode {mode.GameMode.ToString(CultureInfo.InvariantCulture)}",
            $"changelevel {currentMap}",
        };
        return true;
    }
}

public static class MatchCommands
{
    public static string? For(MenuAction action) => action switch
    {
        MenuAction.MatchPause => "mp_pause_match",
        MenuAction.MatchResume => "mp_unpause_match",
        MenuAction.WarmupEnd => "mp_warmup_end",
        MenuAction.SwapTeams => "mp_swapteams",
        MenuAction.MatchRestart => "mp_restartgame 1",
        _ => null,
    };
}
