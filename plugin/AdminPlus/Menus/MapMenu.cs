using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Menu;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenMaps(CCSPlayerController admin)
    {
        var menu = NewMenu("Map und Modus");

        if (Can(admin, MenuAction.ChangeMap))
        {
            // One pack without a rotation: its maps are listed right here. Otherwise one entry per pack: with Cycle it loads the
            // pack (its rotation runs from then on), without Cycle the admin picks a single map in a submenu.
            if (Config.MapPacks.Count == 1 && string.IsNullOrEmpty(Config.MapPacks[0].Cycle))
            {
                AddMapOptions(menu, Config.MapPacks[0]);
            }
            else
            {
                foreach (var pack in Config.MapPacks)
                {
                    var entry = pack;
                    if (!string.IsNullOrEmpty(entry.Cycle))
                        menu.AddMenuOption($"Paket laden: {entry.Label} ({entry.Maps.Count})", (p, _) =>
                            Execute(p, MenuAction.ChangeMap, entry.Cycle, "Paket laden", () => AdminActions.LoadPack(entry)));
                    else
                        menu.AddMenuOption($"Karten: {entry.Label} ({entry.Maps.Count})", (p, _) => OpenPack(p, entry));
                }
            }
        }

        if (Can(admin, MenuAction.ChangeMode))
        {
            foreach (var mode in Config.Modes)
            {
                var entry = mode;
                menu.AddMenuOption($"Modus: {entry.Label}", (p, _) =>
                    Execute(p, MenuAction.ChangeMode, entry.Name, "", () => AdminActions.ChangeMode(entry)));
            }
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        Show(menu, admin);
    }

    internal void OpenPack(CCSPlayerController admin, MapPack pack)
    {
        var menu = NewMenu(pack.Label);

        if (Can(admin, MenuAction.ChangeMap))
            AddMapOptions(menu, pack);

        menu.AddMenuOption("Zurück", (p, _) => OpenMaps(p));
        Show(menu, admin);
    }

    private void AddMapOptions(IMenu menu, MapPack pack)
    {
        foreach (var map in pack.Maps)
        {
            var entry = map;
            menu.AddMenuOption(entry.Label, (p, _) =>
                Execute(p, MenuAction.ChangeMap, string.IsNullOrEmpty(entry.WorkshopId) ? entry.Name : entry.WorkshopId, pack.Name,
                    () => AdminActions.ChangeMap(entry)));
        }
    }
}
