using AdminPlus.Logic;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Cvars;
using CounterStrikeSharp.API.Modules.Timers;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus
{
    /// <summary>Checks every few seconds and right after a join, so maps that add their own bots are covered too.</summary>
    private void StartBotSlotRule()
    {
        AddTimer(3f, EnforceBotSlots, TimerFlags.REPEAT);
        RegisterEventHandler<EventPlayerConnectFull>((_, _) =>
        {
            Server.NextFrame(EnforceBotSlots);
            return HookResult.Continue;
        });
    }

    private void EnforceBotSlots()
    {
        int reserved = Config.ReservedHumanSlots;
        if (reserved <= 0) return;

        try
        {
            var players = Utilities.GetPlayers().Where(p => p.IsValid && !p.IsHLTV).ToList();
            var bots = players.Where(p => p.IsBot).ToList();
            int humans = players.Count - bots.Count;

            int excess = BotSlots.ExcessBots(Server.MaxPlayers, humans, bots.Count, reserved);
            if (excess == 0) return;

            // A map's bot_quota would add the kicked bots again, so lower it to what is allowed.
            int allowed = BotSlots.AllowedBots(Server.MaxPlayers, humans, reserved);
            var quota = ConVar.Find("bot_quota");
            if (quota != null && quota.GetPrimitiveValue<int>() > allowed)
                Server.ExecuteCommand($"bot_quota {allowed}");

            foreach (var bot in bots.Take(excess))
                if (bot.UserId is int userId)
                    Server.ExecuteCommand($"kickid {userId}");

            Logger.LogInformation("{Line}", Audit.Format(0, "server", "BotSlots",
                $"{excess} bots", $"humans={humans} max={Server.MaxPlayers} reserved={reserved}", Audit.Results.Ok));
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "AdminPlus bot slot rule failed");
        }
    }
}
