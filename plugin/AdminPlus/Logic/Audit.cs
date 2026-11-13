namespace AdminPlus.Logic;

public static class Audit
{
    public static class Results
    {
        public const string Ok = "ok";
        public const string Denied = "denied";
        public const string TargetGone = "target_gone";
        public const string Invalid = "invalid";
        public const string Error = "error";
    }

    private const int MaxFieldLength = 64;

    public static string Format(ulong adminSteamId, string? adminName, string action, string? target, string? detail, string result) =>
        $"AUDIT admin={adminSteamId} name={Quote(adminName)} action={action} target={Quote(target)} detail={Quote(detail)} result={result}";

    private static string Quote(string? value)
    {
        var chars = (value ?? "").Select(c => c switch
        {
            '"' => '\'',
            '\\' => '/',
            _ when char.IsControl(c) => ' ',
            _ => c,
        });

        var text = new string(chars.ToArray());
        if (text.Length > MaxFieldLength) text = text[..MaxFieldLength];
        return $"\"{text}\"";
    }
}
