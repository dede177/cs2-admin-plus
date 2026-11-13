using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenSettings(CCSPlayerController admin)
    {
        var menu = NewMenu("Einstellungen");
        menu.AddMenuOption(_configState.Label(), (_, _) => { }, true);

        if (Can(admin, MenuAction.ChangeCvar))
        {
            foreach (var category in Config.Cvars.Select(c => c.Category).Distinct())
            {
                var name = category;
                menu.AddMenuOption(name, (p, _) => OpenCategory(p, name));
            }
        }

        if (Can(admin, MenuAction.LoadConfig))
            menu.AddMenuOption("Config laden ...", (p, _) => OpenConfigs(p));

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        Show(menu, admin);
    }

    private void OpenCategory(CCSPlayerController admin, string category)
    {
        var menu = NewMenu(category);

        foreach (var cvar in Config.Cvars.Where(c => c.Category == category))
        {
            var def = cvar;
            menu.AddMenuOption(def.Label, (p, _) => OpenCvarValues(p, def));
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenSettings(p));
        Show(menu, admin);
    }

    private void OpenCvarValues(CCSPlayerController admin, CvarDefinition def)
    {
        var menu = NewMenu(def.Label);

        foreach (var value in CvarWhitelist.OptionsFor(def))
        {
            var chosen = value;
            menu.AddMenuOption(chosen, (p, _) =>
            {
                Execute(p, MenuAction.ChangeCvar, def.Name, chosen,
                    () => AdminActions.SetCvar(Config.Cvars, def.Name, chosen, _configState));
                OpenCvarValues(p, def);
            });
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenCategory(p, def.Category));
        Show(menu, admin);
    }

    private void OpenConfigs(CCSPlayerController admin)
    {
        var menu = NewMenu("Config laden");

        foreach (var name in ConfigCatalog.List(ConfigFolderPath))
        {
            var config = name;
            menu.AddMenuOption(config, (p, _) =>
            {
                Execute(p, MenuAction.LoadConfig, config, "",
                    () => AdminActions.LoadConfig(ConfigFolderPath, Config.ConfigDirectory, config, _configState));
                OpenSettings(p);
            });
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenSettings(p));
        Show(menu, admin);
    }
}
