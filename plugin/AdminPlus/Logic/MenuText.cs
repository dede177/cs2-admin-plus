using System.Net;

namespace AdminPlus.Logic;

/// <summary>Player-controlled text (names) before it goes into a menu title or option.</summary>
public static class MenuText
{
    public const int MaxLength = 32;

    public static string Label(string? raw, bool html)
    {
        var chars = (raw ?? "").Select(c => char.IsControl(c) ? ' ' : c).ToArray();
        var text = new string(chars).Trim();
        if (text.Length == 0) return "?";
        if (text.Length > MaxLength) text = text[..MaxLength];
        return html ? WebUtility.HtmlEncode(text) : text;
    }
}
