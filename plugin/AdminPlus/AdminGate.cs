using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus
{
    internal bool Can(CCSPlayerController admin, MenuAction action) =>
        Permissions.Can(flag => AdminManager.PlayerHasPermissions(admin, flag), action);

    /// <summary>
    /// Single choke point for every menu action: re-checks the permission, applies the
    /// target rule for kick and ban, runs the action, writes the audit line and tells the
    /// admin the outcome.
    /// </summary>
    internal void Execute(CCSPlayerController admin, MenuAction action, string target, string detail,
        Func<ActionResult> run, int? targetUserId = null)
    {
        ActionResult outcome;
        try
        {
            outcome = !Can(admin, action)
                ? ActionResult.Denied("Dir fehlt das Recht dafür.")
                : Targeting.Gate(action, targetUserId, id => CheckTarget(admin, id)) ?? run();
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "AdminPlus action {Action} failed", action);
            outcome = new ActionResult(Audit.Results.Error, "Aktion fehlgeschlagen, siehe Serverlog.");
        }

        Logger.LogInformation("{Line}",
            Audit.Format(admin.SteamID, admin.PlayerName, action.ToString(), target, detail, outcome.Result));

        admin.PrintToChat($" {ChatColors.Green}[Admin]{ChatColors.Default} {outcome.Message}");
    }

    /// <summary>
    /// The web panel calls the sm_* commands over RCON, where the caller is null (server console).
    /// A player typing one into the game console needs root; anyone else is refused and audited.
    /// </summary>
    private bool PanelAllowed(CCSPlayerController? caller, CommandInfo info)
    {
        bool allowed = Permissions.AllowsPanelCommand(
            caller == null, flag => AdminManager.PlayerHasPermissions(caller!, flag));

        if (!allowed)
        {
            info.ReplyToCommand("[AdminPlus] Dieser Befehl ist nur über die Server-Konsole oder RCON erlaubt.");
            Logger.LogInformation("{Line}",
                Audit.Format(caller!.SteamID, caller.PlayerName, "PanelCommand", info.ArgByIndex(0), "", Audit.Results.Denied));
        }

        return allowed;
    }

    /// <summary>Kick and ban must not hit the admin themself or someone with higher immunity.</summary>
    internal ActionResult CheckTarget(CCSPlayerController admin, int targetUserId)
    {
        var target = AdminActions.Find(targetUserId);
        if (target == null) return ActionResult.TargetGone();

        bool allowed = Targeting.IsAllowed(
            admin.UserId ?? -1, targetUserId, AdminManager.CanPlayerTarget(admin, target));

        return allowed
            ? ActionResult.Ok("")
            : ActionResult.Denied("Dieser Spieler darf von dir nicht gekickt oder gebannt werden.");
    }
}
