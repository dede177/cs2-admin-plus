namespace AdminPlus.Logic;

/// <summary>The AdminPlus entries that are added to CS2-SimpleAdmin's admin menu.</summary>
public static class BridgeMenus
{
    public const string CategoryId = "adminplus";
    public const string CategoryName = "HSTX Server";

    /// <summary>The category is only shown to admins who may open SimpleAdmin's menu at all.</summary>
    public const string CategoryPermission = "@css/generic";

    public sealed record Entry(string Id, string Title, string Permission);

    /// <summary>Shown entries; every action inside is checked again by AdminGate.Execute.</summary>
    public static readonly IReadOnlyList<Entry> All = new[]
    {
        new Entry("adminplus_maps", "Map und Modus", "@css/changemap"),
        new Entry("adminplus_settings", "Einstellungen", "@css/cvar"),
        new Entry("adminplus_match", "Match", "@css/changemap"),
    };
}
