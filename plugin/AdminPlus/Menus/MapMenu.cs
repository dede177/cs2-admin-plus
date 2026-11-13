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
            // One pack: its maps are listed right here. Several packs: the admin picks a pack first.
            if (Config.MapPacks.Count == 1)
            {
                AddMapOptions(menu, Config.MapPacks[0]);
            }
            else
            {
                foreach (var pack in Config.MapPacks.Where(p => !string.IsNullOrEmpty(p.Cycle)))
                {
                    var entry = pack;
                    menu.AddMenuOption($"Paket laden: {entry.Label} ({entry.Maps.Count})", (p, _) =>
                        Execute(p, MenuAction.ChangeMap, entry.Cycle, "Paket laden", () => AdminActions.LoadPack(entry)));
                }

                foreach (var pack in Config.MapPacks)
                {
                    var entry = pack;
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
        {
            if (!string.IsNullOrEmpty(pack.Cycle))
                menu.AddMenuOption("Paket laden (Rotation starten)", (p, _) =>
                    Execute(p, MenuAction.ChangeMap, pack.Cycle, "Paket laden", () => AdminActions.LoadPack(pack)));
            AddMapOptions(menu, pack);
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenMaps(p));
        Show(menu, admin);
    }

    private void AddMapOptions(IMenu menu, MapPack pack)
    {
        foreach (var map in pack.Maps)
        {
            var entry = map;
            if (!string.IsNullOrEmpty(pack.Cycle))
                menu.AddMenuOption(entry.Label, (p, _) =>
                    Execute(p, MenuAction.ChangeMap, entry.Name, $"Paket laden {pack.Cycle}", () => AdminActions.LoadPack(pack, entry)));
            else
                menu.AddMenuOption(entry.Label, (p, _) =>
                    Execute(p, MenuAction.ChangeMap, string.IsNullOrEmpty(entry.WorkshopId) ? entry.Name : entry.WorkshopId, pack.Name,
                        () => AdminActions.ChangeMap(entry)));
        }
    }
}
