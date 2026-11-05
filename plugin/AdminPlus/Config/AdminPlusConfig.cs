using System.Text.Json.Serialization;
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public class AdminPlusConfig : BasePluginConfig
{
    [JsonPropertyName("ConfigDirectory")]
    [JsonConverter(typeof(TolerantStringConverter))]
    public string ConfigDirectory { get; set; } = "hstx";

    [JsonPropertyName("MenuType")]
    [JsonConverter(typeof(TolerantStringConverter))]
    public string MenuType { get; set; } = "chat";

    /// <summary>Player slots kept free for humans: bots are removed so that at least this many slots stay open. 0 switches the rule off.</summary>
    [JsonPropertyName("ReservedHumanSlots")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int ReservedHumanSlots { get; set; } = BotSlots.DefaultReserved;

    [JsonPropertyName("Cvars")]
    [JsonConverter(typeof(TolerantListConverter<CvarDefinition>))]
    public List<CvarDefinition> Cvars { get; set; } = DefaultCvars.Create();

    private List<MapPack>? _packs;
    private bool _packsSpecified;

    /// <summary>Map packs shown in the menu. A file that does not mention MapPacks gets the default ESL pack (or its legacy Maps list).</summary>
    [JsonPropertyName("MapPacks")]
    [JsonConverter(typeof(TolerantListConverter<MapPack>))]
    public List<MapPack> MapPacks
    {
        get => _packs ??= DefaultCatalog.Packs();
        set { _packs = value; _packsSpecified = true; }
    }

    /// <summary>Legacy key from before map packs existed: read once, turned into one pack and never written again.</summary>
    [JsonPropertyName("Maps")]
    [JsonConverter(typeof(TolerantListConverter<MapEntry>))]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<MapEntry>? Maps { get; set; }

    [JsonPropertyName("Modes")]
    [JsonConverter(typeof(TolerantListConverter<ModeDefinition>))]
    public List<ModeDefinition> Modes { get; set; } = DefaultCatalog.Modes();

    /// <summary>Entries the tolerant JSON converters could not read become markers; drop them with one log line each.</summary>
    private static void DropUnreadable<T>(List<T>? list, string what, List<string> problems) where T : class, INamedEntry
    {
        int dropped = list?.RemoveAll(e => e != null && e.Name == TolerantJson.InvalidName) ?? 0;
        for (int i = 0; i < dropped; i++)
            problems.Add($"{what}-Eintrag konnte nicht gelesen werden (falscher JSON-Typ oder unbekannter Wert), übersprungen");
    }

    private void NormalizeMapPacks(List<string> problems)
    {
        List<MapPack> source;
        if (_packsSpecified) source = _packs ?? new List<MapPack>();
        else if (Maps is { Count: > 0 }) source = new List<MapPack> { new() { Name = "maps", Label = "Maps", Maps = Maps } };
        else source = new List<MapPack>();

        var packs = MapPackRules.Sanitize(source, problems);
        if (packs.Count == 0)
        {
            if (_packsSpecified || Maps is { Count: > 0 })
                problems.Add("Keine gültigen Map-Pakete, verwende das Standardpaket 'esl'");
            packs = DefaultCatalog.Packs();
        }

        MapPacks = packs;
        Maps = null;
    }

    public void Normalize(List<string> problems)
    {
        DropUnreadable(Cvars, "Cvar", problems);
        DropUnreadable(Maps, "Map", problems);
        DropUnreadable(Modes, "Modus", problems);

        Cvars = CvarWhitelist.Sanitize(Cvars, problems);

        NormalizeMapPacks(problems);

        Modes = (Modes ?? new List<ModeDefinition>()).Where(m => m != null).ToList();
        Modes.RemoveAll(m =>
        {
            var ok = MapCommands.TryBuildMode(m, "de_dust2", out _);
            if (!ok) problems.Add($"Modus '{m.Name}': ungültig");
            return !ok;
        });
        foreach (var m in Modes.Where(m => string.IsNullOrWhiteSpace(m.Label))) m.Label = m.Name;

        if (!ConfigCatalog.IsValidFolder(ConfigDirectory))
        {
            problems.Add($"ConfigDirectory '{ConfigDirectory}' ungültig, verwende 'hstx'");
            ConfigDirectory = "hstx";
        }

        if (!BotSlots.IsValidReserved(ReservedHumanSlots))
        {
            problems.Add($"ReservedHumanSlots {ReservedHumanSlots} ungültig (0 bis {BotSlots.MaxReserved}), verwende {BotSlots.DefaultReserved}");
            ReservedHumanSlots = BotSlots.DefaultReserved;
        }

        if (MenuType != "chat" && MenuType != "center")
        {
            problems.Add($"MenuType '{MenuType}' ungültig, verwende 'chat'");
            MenuType = "chat";
        }
    }
}
