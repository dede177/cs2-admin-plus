namespace AdminPlus.Logic;

public static class DefaultCvars
{
    private static CvarDefinition Choice(string name, string label, string category, params string[] values) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Choice, Values = values.ToList() };

    private static CvarDefinition Bool(string name, string label, string category) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Bool };

    private static CvarDefinition Int(string name, string label, string category, int min, int max, int step) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Int, Min = min, Max = max, Step = step };

    public static List<CvarDefinition> Create() => new()
    {
        Choice("mp_roundtime", "Rundenzeit (Min)", "Runden", "1.92", "2", "2.5", "3", "5"),
        Choice("mp_roundtime_defuse", "Rundenzeit Defuse (Min)", "Runden", "1.92", "2", "2.5", "3", "5"),
        Int("mp_freezetime", "Freezetime (s)", "Runden", 5, 20, 5),
        Choice("mp_maxrounds", "Max. Runden", "Runden", "12", "16", "24", "30"),
        Choice("mp_c4timer", "C4-Timer (s)", "Runden", "40", "45"),

        Choice("mp_startmoney", "Startgeld", "Wirtschaft", "800", "2500", "10000", "16000"),
        Choice("mp_buytime", "Kaufzeit (s)", "Wirtschaft", "15", "20", "30", "45", "60", "90"),
        Choice("mp_afterroundmoney", "Geld nach Runde", "Wirtschaft", "0", "1000", "5000"),

        Bool("mp_friendlyfire", "Friendly Fire", "Regeln"),
        Bool("mp_autoteambalance", "Auto-Teambalance", "Regeln"),
        Int("mp_limitteams", "Max. Teamunterschied", "Regeln", 0, 2, 1),
        Bool("mp_overtime_enable", "Overtime", "Regeln"),
        Bool("sv_alltalk", "Alltalk", "Regeln"),

        Choice("mp_warmuptime", "Warmup-Zeit (s)", "Warmup", "30", "60", "120", "300"),
        Bool("mp_warmup_pausetimer", "Warmup-Timer pausieren", "Warmup"),

        Int("bot_quota", "Bots", "Bots", 0, 10, 5),
        Int("bot_difficulty", "Bot-Schwierigkeit", "Bots", 0, 3, 1),
    };
}
