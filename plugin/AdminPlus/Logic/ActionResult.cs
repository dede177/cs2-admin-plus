namespace AdminPlus.Logic;

public readonly record struct ActionResult(string Result, string Message)
{
    public static ActionResult Ok(string message) => new(Audit.Results.Ok, message);
    public static ActionResult TargetGone() => new(Audit.Results.TargetGone, "Spieler nicht mehr auf dem Server.");
    public static ActionResult Invalid(string message) => new(Audit.Results.Invalid, message);
    public static ActionResult Denied(string message) => new(Audit.Results.Denied, message);
}
