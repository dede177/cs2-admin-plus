namespace AdminPlus.Logic;

/// <summary>
/// A chat command such as "!map x" reaches the plugin twice: once as the chat line and once as css_map.
/// Both mean the same thing, so the second one within a short window is not logged again.
/// </summary>
public sealed class CommandDuplicateFilter
{
    private static readonly TimeSpan Window = TimeSpan.FromSeconds(2);
    private const int MaxEntries = 64;

    private readonly Dictionary<(ulong, string), DateTime> _seen = new();

    public int Count => _seen.Count;

    /// <summary>Chat form (!map, /map) and console form (css_map) of one command get the same key.</summary>
    public static string Key(string detail)
    {
        detail = detail.Trim();
        if (detail.Length > 0 && detail[0] is '!' or '/')
            detail = "css_" + detail[1..];
        return detail;
    }

    public bool IsDuplicate(ulong steamId, string detail, DateTime nowUtc)
    {
        var key = (steamId, Key(detail));

        if (_seen.TryGetValue(key, out var last) && nowUtc - last <= Window)
            return true;

        if (_seen.Count >= MaxEntries)
            foreach (var old in _seen.Where(e => nowUtc - e.Value > Window).Select(e => e.Key).ToList())
                _seen.Remove(old);
        if (_seen.Count >= MaxEntries) _seen.Clear();

        _seen[key] = nowUtc;
        return false;
    }
}
