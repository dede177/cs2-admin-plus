using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public enum CvarKind { Bool, Int, Float, Choice }

public sealed class CvarDefinition : INamedEntry
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";
    [JsonPropertyName("Category")] public string Category { get; set; } = "";

    [JsonPropertyName("Kind")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CvarKind Kind { get; set; } = CvarKind.Choice;

    [JsonPropertyName("Values")]
    [JsonConverter(typeof(TolerantStringListConverter))]
    public List<string> Values { get; set; } = new();

    [JsonPropertyName("Min")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public double Min { get; set; }

    [JsonPropertyName("Max")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public double Max { get; set; }

    [JsonPropertyName("Step")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public double Step { get; set; } = 1;
}

public static class CvarWhitelist
{
    public const int MaxOptions = 24;

    private static readonly Regex NameRx =
        new(@"^[a-z_][a-z0-9_]{0,63}\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex ValueRx =
        new(@"^[A-Za-z0-9_.\-]{1,32}\z", RegexOptions.CultureInvariant);

    private static readonly HashSet<string> Forbidden = new(StringComparer.OrdinalIgnoreCase)
    {
        "sv_cheats", "rcon_password", "sv_password", "sv_setsteamaccount", "exec", "quit", "exit",
    };

    public static bool IsForbidden(string name) =>
        Forbidden.Contains(name)
        || name.Contains("password", StringComparison.OrdinalIgnoreCase)
        || name.Contains("cheat", StringComparison.OrdinalIgnoreCase);

    public static bool IsNameSafe(string? name) =>
        name != null && NameRx.IsMatch(name) && !IsForbidden(name);

    public static bool IsValueSafe(string? value) =>
        value != null && ValueRx.IsMatch(value);

    private static string Format(double v) =>
        Math.Round(v, 4).ToString("0.####", CultureInfo.InvariantCulture);

    public static IReadOnlyList<string> OptionsFor(CvarDefinition d)
    {
        switch (d.Kind)
        {
            case CvarKind.Bool:
                return new[] { "0", "1" };
            case CvarKind.Choice:
                return d.Values ?? new List<string>();
            default:
                var list = new List<string>();
                if (d.Step <= 0 || d.Max < d.Min) return list;
                for (int i = 0; i <= MaxOptions; i++)
                {
                    double v = d.Min + i * d.Step;
                    if (v > d.Max + 1e-9) break;
                    list.Add(d.Kind == CvarKind.Int
                        ? ((long)Math.Round(v)).ToString(CultureInfo.InvariantCulture)
                        : Format(v));
                }
                return list;
        }
    }

    public static List<CvarDefinition> Sanitize(IEnumerable<CvarDefinition?>? defs, List<string> problems)
    {
        var result = new List<CvarDefinition>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var d in defs ?? Enumerable.Empty<CvarDefinition?>())
        {
            if (d == null) { problems.Add("Cvar-Eintrag ist leer"); continue; }
            if (!IsNameSafe(d.Name)) { problems.Add($"Cvar '{d.Name}': Name unzulässig oder verboten"); continue; }
            if (!seen.Add(d.Name)) { problems.Add($"Cvar '{d.Name}': doppelt"); continue; }

            var options = OptionsFor(d);
            if (options.Count == 0) { problems.Add($"Cvar '{d.Name}': keine Werte"); continue; }
            if (options.Count > MaxOptions) { problems.Add($"Cvar '{d.Name}': mehr als {MaxOptions} Werte"); continue; }
            if (options.Any(o => !IsValueSafe(o))) { problems.Add($"Cvar '{d.Name}': unzulässiger Wert"); continue; }
            if (options.Distinct(StringComparer.Ordinal).Count() != options.Count) { problems.Add($"Cvar '{d.Name}': doppelte Werte"); continue; }

            if (string.IsNullOrWhiteSpace(d.Label)) d.Label = d.Name;
            if (string.IsNullOrWhiteSpace(d.Category)) d.Category = "Sonstige";
            result.Add(d);
        }

        return result;
    }

    public static bool TryBuildCommand(
        IEnumerable<CvarDefinition> defs, string name, string value, out string command, out string error)
    {
        command = "";
        error = "";

        var def = defs.FirstOrDefault(d => string.Equals(d.Name, name, StringComparison.OrdinalIgnoreCase));
        if (def == null || !IsNameSafe(def.Name)) { error = "Cvar nicht in der Whitelist."; return false; }
        if (!IsValueSafe(value) || !OptionsFor(def).Contains(value, StringComparer.Ordinal))
        {
            error = "Wert nicht erlaubt.";
            return false;
        }

        command = $"{def.Name} {value}";
        return true;
    }
}
