namespace AdminPlus.Logic;

/// <summary>
/// Spots map-changing and rcon commands that do not go through the menu (CounterStrikeSharp's own
/// css_map, css_changemap, css_wsmap and css_rcon in the console or chat, plus the plain engine commands),
/// so that the server log shows who changed the map. Passwords are never written to the log.
/// </summary>
public static class CommandAudit
{
    public const string Action = "MapCommand";

    private static readonly HashSet<string> Commands = new(StringComparer.OrdinalIgnoreCase)
    {
        "css_map", "css_changemap", "css_wsmap", "css_rcon",
        "changelevel", "map", "host_workshop_map", "ds_workshop_changelevel",
    };

    private static readonly string[] SecretWords = { "password", "rcon_password", "sv_password", "steamaccount" };

    public static (string Action, string Detail)? Classify(string? command, string? args)
    {
        command = (command ?? "").Trim().ToLowerInvariant();
        args = Unquote(args);

        if (command is "say" or "say_team")
        {
            if (args.Length < 2 || args[0] is not ('!' or '/')) return null;
            var parts = args[1..].Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0 || !Commands.Contains("css_" + parts[0])) return null;
            return (Action, Describe(args[0] + parts[0].ToLowerInvariant(), parts.Length > 1 ? parts[1] : ""));
        }

        if (!Commands.Contains(command)) return null;
        return (Action, Describe(command, args));
    }

    private static string Describe(string command, string args)
    {
        if (SecretWords.Any(w => args.Contains(w, StringComparison.OrdinalIgnoreCase)))
            args = "[verborgen]";
        return args.Length == 0 ? command : $"{command} {args}";
    }

    private static string Unquote(string? text)
    {
        text = (text ?? "").Trim();
        if (text.Length >= 2 && text[0] == '"' && text[^1] == '"') text = text[1..^1].Trim();
        return text;
    }
}
