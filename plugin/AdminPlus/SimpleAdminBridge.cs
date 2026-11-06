using AdminPlus.Logic;
using CS2_SimpleAdminApi;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Capabilities;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.Loader;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

/// <summary>
/// When CS2-SimpleAdmin is loaded, AdminPlus adds its map, settings and match entries to SimpleAdmin's admin menu
/// and !admin opens that single menu. Without SimpleAdmin (or when the bridge fails) the chat menu stays as it was.
/// Every action still runs through Execute, so permissions are checked again and the AUDIT line is written.
/// </summary>
public partial class AdminPlus
{
    private static readonly PluginCapability<ICS2_SimpleAdminApi> SimpleAdminCapability = new("simpleadmin:api");

    private ICS2_SimpleAdminApi? _simpleAdmin;
    private bool _bridgeReady;
    private bool _bridgeAttempted;

    /// <summary>True while SimpleAdmin's menu carries the AdminPlus entries, so !admin must not open a second menu.</summary>
    private bool BridgeActive => _bridgeReady;

    public override void OnAllPluginsLoaded(bool hotReload)
    {
        if (!Config.UseSimpleAdminMenu) return;

        // Servers without CS2-SimpleAdmin have no shared CS2-SimpleAdminApi.dll; code that names its types must not run there.
        if (!SimpleAdminApiPresent())
        {
            Logger.LogInformation("AdminPlus: CS2-SimpleAdmin nicht installiert, eigenes Chat-Menü bleibt aktiv");
            return;
        }

        try { ConnectSimpleAdmin(); }
        catch (Exception ex)
        {
            _bridgeReady = false;
            Logger.LogWarning(ex, "AdminPlus: Anbindung an CS2-SimpleAdmin fehlgeschlagen, eigenes Chat-Menü bleibt aktiv");
        }
    }

    private bool SimpleAdminApiPresent()
    {
        try
        {
            var context = AssemblyLoadContext.GetLoadContext(typeof(AdminPlus).Assembly) ?? AssemblyLoadContext.Default;
            return context.LoadFromAssemblyName(new AssemblyName("CS2-SimpleAdminApi")) != null;
        }
        catch (Exception)
        {
            return false;
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private void ConnectSimpleAdmin()
    {
        if (_simpleAdmin != null) return;

        try
        {
            var api = SimpleAdminCapability.Get();
            if (api == null)
            {
                Logger.LogInformation("AdminPlus: CS2-SimpleAdmin nicht geladen, eigenes Chat-Menü bleibt aktiv");
                return;
            }

            _simpleAdmin = api;
            _bridgeAttempted = true;
            api.OnSimpleAdminReady += RegisterBridgeMenus;
            RegisterBridgeMenus();
        }
        catch (Exception ex)
        {
            _simpleAdmin = null;
            _bridgeReady = false;
            Logger.LogWarning(ex, "AdminPlus: Anbindung an CS2-SimpleAdmin fehlgeschlagen, eigenes Chat-Menü bleibt aktiv");
        }
    }

    private void RegisterBridgeMenus()
    {
        var api = _simpleAdmin;
        if (api == null || _bridgeReady) return;

        try
        {
            api.RegisterMenuCategory(BridgeMenus.CategoryId, BridgeMenus.CategoryName, BridgeMenus.CategoryPermission);
            foreach (var entry in BridgeMenus.All)
            {
                var id = entry.Id;
                api.RegisterMenu(BridgeMenus.CategoryId, id, entry.Title,
                    (player, context) => BuildBridgeMenu(api, id, context, player), entry.Permission, null);
            }

            _bridgeReady = true;
            Logger.LogInformation("AdminPlus: Einträge im Menü von CS2-SimpleAdmin registriert ({Count})", BridgeMenus.All.Count);
        }
        catch (Exception ex)
        {
            _bridgeReady = false;
            Logger.LogWarning(ex, "AdminPlus: Menü-Einträge in CS2-SimpleAdmin konnten nicht registriert werden");
        }
    }

    public override void Unload(bool hotReload)
    {
        if (!_bridgeAttempted) return;

        try { DisconnectSimpleAdmin(); }
        catch (Exception ex) { Logger.LogWarning(ex, "AdminPlus: Abmeldung von CS2-SimpleAdmin fehlgeschlagen"); }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private void DisconnectSimpleAdmin()
    {
        var api = _simpleAdmin;
        if (api == null) return;

        try
        {
            api.OnSimpleAdminReady -= RegisterBridgeMenus;
            foreach (var entry in BridgeMenus.All)
                api.UnregisterMenu(BridgeMenus.CategoryId, entry.Id);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "AdminPlus: Menü-Einträge in CS2-SimpleAdmin konnten nicht entfernt werden");
        }

        _bridgeReady = false;
        _simpleAdmin = null;
    }

    private object BuildBridgeMenu(ICS2_SimpleAdminApi api, string id, MenuContext context, CCSPlayerController admin) => id switch
    {
        "adminplus_maps" => BuildMapsMenu(api, context, admin),
        "adminplus_settings" => BuildSettingsMenu(api, context, admin),
        _ => BuildMatchMenu(api, context, admin),
    };

    private object BuildMapsMenu(ICS2_SimpleAdminApi api, MenuContext context, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(context, admin);

        if (Can(admin, MenuAction.ChangeMap))
        {
            foreach (var pack in Config.MapPacks)
            {
                var entry = pack;
                api.AddSubMenu(menu, $"Paket: {entry.Label} ({entry.Maps.Count})",
                    p => BuildPackMenu(api, entry, p), false, null);
            }
        }

        if (Can(admin, MenuAction.ChangeMode))
        {
            foreach (var mode in Config.Modes)
            {
                var entry = mode;
                api.AddMenuOption(menu, $"Modus: {entry.Label}", p =>
                    Execute(p, MenuAction.ChangeMode, entry.Name, "", () => AdminActions.ChangeMode(entry)), false, null);
            }
        }

        return menu;
    }

    private object BuildPackMenu(ICS2_SimpleAdminApi api, MapPack pack, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(pack.Label, BridgeMenus.CategoryId, admin);

        foreach (var map in pack.Maps)
        {
            var entry = map;
            api.AddMenuOption(menu, entry.Label, p =>
                Execute(p, MenuAction.ChangeMap, string.IsNullOrEmpty(entry.WorkshopId) ? entry.Name : entry.WorkshopId, pack.Name,
                    () => AdminActions.ChangeMap(entry)), false, null);
        }

        return menu;
    }

    private object BuildSettingsMenu(ICS2_SimpleAdminApi api, MenuContext context, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(context, admin);

        if (Can(admin, MenuAction.ChangeCvar))
        {
            foreach (var category in Config.Cvars.Select(c => c.Category).Distinct())
            {
                var name = category;
                api.AddSubMenu(menu, name, p => BuildCategoryMenu(api, name, p), false, null);
            }
        }

        if (Can(admin, MenuAction.LoadConfig))
            api.AddSubMenu(menu, "Config laden ...", p => BuildConfigsMenu(api, p), false, null);

        return menu;
    }

    private object BuildCategoryMenu(ICS2_SimpleAdminApi api, string category, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(category, BridgeMenus.CategoryId, admin);

        foreach (var cvar in Config.Cvars.Where(c => c.Category == category))
        {
            var def = cvar;
            api.AddSubMenu(menu, def.Label, p => BuildCvarMenu(api, def, p), false, null);
        }

        return menu;
    }

    private object BuildCvarMenu(ICS2_SimpleAdminApi api, CvarDefinition def, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(def.Label, BridgeMenus.CategoryId, admin);

        foreach (var value in CvarWhitelist.OptionsFor(def))
        {
            var chosen = value;
            api.AddMenuOption(menu, chosen, p =>
                Execute(p, MenuAction.ChangeCvar, def.Name, chosen,
                    () => AdminActions.SetCvar(Config.Cvars, def.Name, chosen, _configState)), false, null);
        }

        return menu;
    }

    private object BuildConfigsMenu(ICS2_SimpleAdminApi api, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack("Config laden", BridgeMenus.CategoryId, admin);

        foreach (var name in ConfigCatalog.List(ConfigFolderPath))
        {
            var config = name;
            api.AddMenuOption(menu, config, p =>
                Execute(p, MenuAction.LoadConfig, config, "",
                    () => AdminActions.LoadConfig(ConfigFolderPath, Config.ConfigDirectory, config, _configState)), false, null);
        }

        return menu;
    }

    private object BuildMatchMenu(ICS2_SimpleAdminApi api, MenuContext context, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack(context, admin);

        void Add(string label, MenuAction action)
        {
            if (!Can(admin, action)) return;
            api.AddMenuOption(menu, label, p => Execute(p, action, "", "", () => AdminActions.Match(action, label)), false, null);
        }

        Add("Pause", MenuAction.MatchPause);
        Add("Fortsetzen", MenuAction.MatchResume);
        Add("Warmup beenden", MenuAction.WarmupEnd);
        Add("Teams tauschen", MenuAction.SwapTeams);

        if (Can(admin, MenuAction.MatchRestart))
            api.AddSubMenu(menu, "Neustart ...", p => BuildRestartConfirm(api, p), false, null);

        return menu;
    }

    private object BuildRestartConfirm(ICS2_SimpleAdminApi api, CCSPlayerController admin)
    {
        var menu = api.CreateMenuWithBack("Match wirklich neu starten?", BridgeMenus.CategoryId, admin);
        api.AddMenuOption(menu, "Ja, neu starten", p =>
            Execute(p, MenuAction.MatchRestart, "", "", () => AdminActions.Match(MenuAction.MatchRestart, "Match neu gestartet")), false, null);
        return menu;
    }
}
