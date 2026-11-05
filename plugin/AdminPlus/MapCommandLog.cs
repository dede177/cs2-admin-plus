using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Commands;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus
{
    /// <summary>Writes an AUDIT line for map-changing and rcon commands that bypass the menu (see CommandAudit).</summary>
    private void StartMapCommandLog() =>
        AddCommandListener(null, OnAnyCommand);

    private HookResult OnAnyCommand(CCSPlayerController? player, CommandInfo info)
    {
        try
        {
            var hit = CommandAudit.Classify(info.ArgByIndex(0), info.ArgString);
            if (hit == null) return HookResult.Continue;

            bool fromPlayer = player is { IsValid: true };
            Logger.LogInformation("{Line}", Audit.Format(
                fromPlayer ? player!.SteamID : 0,
                fromPlayer ? player!.PlayerName : "server",
                hit.Value.Action, "", hit.Value.Detail, Audit.Results.Ok));
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "AdminPlus map command log failed");
        }

        return HookResult.Continue;
    }
}
