using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public static class MapPackRules
{
    private static readonly Regex NameRx = new(@"^[A-Za-z0-9_\-]{1,32}\z", RegexOptions.CultureInvariant);

    public static bool IsValidName(string? name) => name != null && NameRx.IsMatch(name);

    /// <summary>Keeps the valid maps of a pack. Unreadable and invalid entries are logged, null entries are skipped silently.</summary>
    public static List<MapEntry> SanitizeMaps(IEnumerable<MapEntry?>? maps, string packName, List<string> problems)
    {
        var result = new List<MapEntry>();
        foreach (var map in maps ?? Enumerable.Empty<MapEntry?>())
        {
            if (map == null) continue;
            if (map.Name == TolerantJson.InvalidName)
            {
                problems.Add($"Map-Eintrag in Paket '{packName}' konnte nicht gelesen werden (falscher JSON-Typ), übersprungen");
                continue;
            }
            if (!MapCommands.TryBuild(map, out _))
            {
                problems.Add($"Map '{map.Name}' in Paket '{packName}': ungültig");
                continue;
            }
            if (string.IsNullOrWhiteSpace(map.Label)) map.Label = map.Name;
            result.Add(map);
        }
        return result;
    }

    /// <summary>Keeps the usable packs in their order. Bad names, duplicates and packs without a valid map are dropped and logged.</summary>
    public static List<MapPack> Sanitize(IEnumerable<MapPack?>? packs, List<string> problems)
    {
        var result = new List<MapPack>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var pack in packs ?? Enumerable.Empty<MapPack?>())
        {
            if (pack == null) continue;
            if (pack.Name == TolerantJson.InvalidName)
            {
                problems.Add("Map-Paket-Eintrag konnte nicht gelesen werden (falscher JSON-Typ), übersprungen");
                continue;
            }
            if (!IsValidName(pack.Name)) { problems.Add($"Map-Paket '{pack.Name}': Name unzulässig"); continue; }
            if (!seen.Add(pack.Name)) { problems.Add($"Map-Paket '{pack.Name}': doppelt"); continue; }

            var maps = SanitizeMaps(pack.Maps, pack.Name, problems);
            if (maps.Count == 0) { problems.Add($"Map-Paket '{pack.Name}': keine gültigen Maps, übersprungen"); continue; }

            pack.Maps = maps;
            if (string.IsNullOrWhiteSpace(pack.Label)) pack.Label = pack.Name;
            if (!string.IsNullOrEmpty(pack.Cycle) && !MapCommands.IsValidCycleName(pack.Cycle))
            {
                problems.Add($"Map-Paket '{pack.Name}': Cycle '{pack.Cycle}' ungültig, 'Paket laden' fällt weg");
                pack.Cycle = "";
            }
            result.Add(pack);
        }

        return result;
    }
}
