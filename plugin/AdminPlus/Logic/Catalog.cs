using System.Text.Json.Serialization;

namespace AdminPlus.Logic;

public sealed class MapEntry : INamedEntry
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";
    [JsonPropertyName("WorkshopId")] public string WorkshopId { get; set; } = "";
}

public sealed class MapPack : INamedEntry
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";

    [JsonPropertyName("Maps")]
    [JsonConverter(typeof(TolerantListConverter<MapEntry>))]
    public List<MapEntry> Maps { get; set; } = new();
}

public sealed class ModeDefinition : INamedEntry
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";

    [JsonPropertyName("GameType")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int GameType { get; set; }

    [JsonPropertyName("GameMode")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int GameMode { get; set; }
}

public static class DefaultCatalog
{
    private static MapEntry Map(string name, string label) => new() { Name = name, Label = label };

    public static List<MapEntry> Maps() => new()
    {
        // ESL Pro League Season 24 Active Duty pool (Overpass moved to reserve when Cache returned)
        Map("de_ancient", "Ancient"), Map("de_anubis", "Anubis"), Map("de_cache", "Cache"),
        Map("de_dust2", "Dust 2"), Map("de_inferno", "Inferno"), Map("de_mirage", "Mirage"),
        Map("de_nuke", "Nuke"),
    };

    public static List<MapPack> Packs() => new()
    {
        new() { Name = "esl", Label = "ESL Pool", Maps = Maps() },
    };

    public static List<ModeDefinition> Modes() => new()
    {
        new() { Name = "competitive", Label = "Competitive", GameType = 0, GameMode = 1 },
        new() { Name = "wingman", Label = "Wingman", GameType = 0, GameMode = 2 },
        new() { Name = "casual", Label = "Casual", GameType = 0, GameMode = 0 },
        new() { Name = "deathmatch", Label = "Deathmatch", GameType = 1, GameMode = 2 },
    };
}
