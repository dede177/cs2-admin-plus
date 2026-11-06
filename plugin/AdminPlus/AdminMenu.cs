using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Menu;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

public partial class AdminPlus
{
    private bool CenterMenus => Config.MenuType == "center";

    private IMenu NewMenu(string title) =>
        CenterMenus ? new CenterHtmlMenu(title, this) : new ChatMenu(title);

    /// <summary>Player names go through here before they become menu text (HTML-encoded for center menus, truncated).</summary>
    private string PlayerLabel(string? name) => MenuText.Label(name, CenterMenus);

    /// <summary>Closes the menu that is still active (its instance keeps an OnTick listener until Close) and opens the next one.</summary>
    private static void Show(IMenu menu, CCSPlayerController player)
    {
        CloseMenu(player);
        menu.Open(player);
    }

    private static void CloseMenu(CCSPlayerController player) =>
        MenuManager.GetActiveMenu(player)?.Close();

    private void OnAdminCommand(CCSPlayerController? player, CommandInfo info)
    {
        if (player == null)
        {
            info.ReplyToCommand("[AdminPlus] !admin geht nur im Spiel.");
            return;
        }

        if (!Permissions.CanOpenMenu(flag => AdminManager.PlayerHasPermissions(player, flag)))
        {
            player.PrintToChat($" {ChatColors.Red}[Admin]{ChatColors.Default} Kein Zugriff.");
            return;
        }

        // SimpleAdmin's menu carries the AdminPlus entries, so its own !admin handler opens it; no second menu here.
        if (BridgeActive) return;

        OpenMain(player);
    }

    internal void OpenMain(CCSPlayerController admin)
    {
        var menu = NewMenu("HSTX Admin");

        if (Can(admin, MenuAction.Kick) || Can(admin, MenuAction.Ban))
            menu.AddMenuOption("Spieler", (p, _) => OpenPlayers(p));
        if (Can(admin, MenuAction.ChangeMap) || Can(admin, MenuAction.ChangeMode))
            menu.AddMenuOption("Map und Modus", (p, _) => OpenMaps(p));
        if (Can(admin, MenuAction.ChangeCvar) || Can(admin, MenuAction.LoadConfig))
            menu.AddMenuOption("Einstellungen", (p, _) => OpenSettings(p));
        if (Can(admin, MenuAction.MatchPause) || Can(admin, MenuAction.MatchRestart))
            menu.AddMenuOption("Match", (p, _) => OpenMatch(p));
        menu.AddMenuOption("Schließen", (p, _) => CloseMenu(p));

        Show(menu, admin);
    }
}
