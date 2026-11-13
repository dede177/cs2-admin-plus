namespace AdminPlus.Logic;

/// <summary>
/// Keeps a number of player slots free for humans: bots may fill the server only up to
/// maxPlayers - reserved - humans, so a joining human always finds a free slot.
/// </summary>
public static class BotSlots
{
    public const int DefaultReserved = 2;
    public const int MaxReserved = 8;

    public static bool IsValidReserved(int value) => value is >= 0 and <= MaxReserved;

    public static int NormalizeReserved(int value) => IsValidReserved(value) ? value : DefaultReserved;

    public static int AllowedBots(int maxPlayers, int humans, int reserved) =>
        Math.Max(0, maxPlayers - reserved - humans);

    /// <summary>How many bots have to go. 0 when the rule is off or the player limit is unknown.</summary>
    public static int ExcessBots(int maxPlayers, int humans, int bots, int reserved)
    {
        if (reserved <= 0 || maxPlayers <= 0) return 0;
        return Math.Max(0, bots - AllowedBots(maxPlayers, humans, reserved));
    }
}
