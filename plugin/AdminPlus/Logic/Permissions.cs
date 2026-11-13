namespace AdminPlus.Logic;

public enum MenuAction
{
    Kick, Ban, Mute, SwitchTeam, Slay, Respawn,
    ChangeMap, ChangeMode,
    ChangeCvar, LoadConfig,
    MatchPause, MatchResume, WarmupEnd, SwapTeams, MatchRestart,
}

public static class Permissions
{
    public const string Root = "@css/root";

    public static string RequiredFlag(MenuAction action) => action switch
    {
        MenuAction.Kick or MenuAction.Mute or MenuAction.SwitchTeam
            or MenuAction.Slay or MenuAction.Respawn => "@css/kick",
        MenuAction.Ban => "@css/ban",
        MenuAction.ChangeMap or MenuAction.ChangeMode or MenuAction.MatchPause
            or MenuAction.MatchResume or MenuAction.WarmupEnd or MenuAction.SwapTeams => "@css/changemap",
        MenuAction.ChangeCvar => "@css/cvar",
        MenuAction.LoadConfig or MenuAction.MatchRestart => Root,
        _ => throw new ArgumentOutOfRangeException(nameof(action)),
    };

    public static bool Can(Func<string, bool> hasFlag, MenuAction action) =>
        hasFlag(Root) || hasFlag(RequiredFlag(action));

    public static bool CanOpenMenu(Func<string, bool> hasFlag) =>
        Enum.GetValues<MenuAction>().Any(action => Can(hasFlag, action));

    public static bool AllowsPanelCommand(bool callerIsConsole, Func<string, bool> hasFlag) =>
        callerIsConsole || hasFlag(Root);
}

public static class Targeting
{
    public static bool NeedsTargetCheck(MenuAction action) =>
        action is MenuAction.Kick or MenuAction.Ban;

    public static bool IsAllowed(int adminUserId, int targetUserId, bool immunityAllows) =>
        adminUserId != targetUserId && immunityAllows;

    /// <summary>
    /// Decides whether an action may run against its target. Returns null when it may,
    /// otherwise the result that should be audited and shown instead of running it.
    /// </summary>
    public static ActionResult? Gate(MenuAction action, int? targetUserId, Func<int, ActionResult> checkTarget)
    {
        if (!NeedsTargetCheck(action)) return null;
        if (targetUserId is null) return ActionResult.Invalid("Kein Ziel angegeben.");

        var check = checkTarget(targetUserId.Value);
        return check.Result == Audit.Results.Ok ? null : check;
    }
}
