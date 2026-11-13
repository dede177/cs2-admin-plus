using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenMatch(CCSPlayerController admin)
    {
        var menu = NewMenu("Match");

        void Add(string label, MenuAction action)
        {
            if (!Can(admin, action)) return;
            menu.AddMenuOption(label, (p, _) =>
            {
                Execute(p, action, "", "", () => AdminActions.Match(action, label));
                OpenMatch(p);
            });
        }

        Add("Pause", MenuAction.MatchPause);
        Add("Fortsetzen", MenuAction.MatchResume);
        Add("Warmup beenden", MenuAction.WarmupEnd);
        Add("Teams tauschen", MenuAction.SwapTeams);

        if (Can(admin, MenuAction.MatchRestart))
            menu.AddMenuOption("Neustart ...", (p, _) => OpenRestartConfirm(p));

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        Show(menu, admin);
    }

    private void OpenRestartConfirm(CCSPlayerController admin)
    {
        var menu = NewMenu("Match wirklich neu starten?");

        menu.AddMenuOption("Ja, neu starten", (p, _) =>
        {
            Execute(p, MenuAction.MatchRestart, "", "", () => AdminActions.Match(MenuAction.MatchRestart, "Match neu gestartet"));
            OpenMatch(p);
        });
        menu.AddMenuOption("Abbrechen", (p, _) => OpenMatch(p));
        Show(menu, admin);
    }
}
