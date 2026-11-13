using AdminPlus.Logic;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Cvars;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus : BasePlugin, IPluginConfig<AdminPlusConfig>
{
    public override string ModuleName        => "AdminPlus";
    public override string ModuleVersion     => "1.5.2";
    public override string ModuleAuthor      => "dede177";
    public override string ModuleDescription => "Web admin panel command bridge and ingame admin menu";

    public AdminPlusConfig Config { get; set; } = new();

    private readonly ConfigState _configState = new();
    private bool _cvarNamesChecked;

    public void OnConfigParsed(AdminPlusConfig config)
    {
        var problems = new List<string>();
        config.Normalize(problems);
        Config = config;

        foreach (var problem in problems)
            Logger.LogWarning("AdminPlus config: {Problem}", problem);
    }

    public override void Load(bool hotReload)
    {
        AddCommand("css_admin", "Open the HSTX admin menu", OnAdminCommand);
        RegisterListener<Listeners.OnMapStart>(_ => CheckCvarNames());
        StartBotSlotRule();
        StartMapCommandLog();

        Console.WriteLine("[AdminPlus] ✅ Loaded — all sm_ commands registered.");
    }

    private void CheckCvarNames()
    {
        if (_cvarNamesChecked) return;
        _cvarNamesChecked = true;

        foreach (var cvar in Config.Cvars.Where(c => ConVar.Find(c.Name) == null))
            Logger.LogWarning("AdminPlus config: Cvar '{Name}' existiert auf diesem Server nicht", cvar.Name);
    }

    /// <summary>Absolute path of game/csgo/cfg, derived from the plugin directory.</summary>
    private string CfgRoot => Path.GetFullPath(Path.Combine(ModuleDirectory, "..", "..", "..", "..", "cfg"));

    private string ConfigFolderPath => Path.Combine(CfgRoot, Config.ConfigDirectory);
}
