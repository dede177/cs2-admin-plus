using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class AuditTests
{
    [Fact]
    public void Line_has_the_agreed_format()
    {
        var line = Audit.Format(76561198000000000, "Thilo", "Kick", "Max", "", Audit.Results.Ok);

        Assert.Equal(
            "AUDIT admin=76561198000000000 name=\"Thilo\" action=Kick target=\"Max\" detail=\"\" result=ok",
            line);
    }

    [Fact]
    public void Newlines_in_a_player_name_cannot_create_a_second_log_line()
    {
        var line = Audit.Format(1, "Evil\nAUDIT admin=2 result=ok", "Kick", "x", "", Audit.Results.Denied);

        Assert.DoesNotContain('\n', line);
        Assert.DoesNotContain('\r', line);
    }

    [Fact]
    public void Quotes_and_backslashes_in_a_name_cannot_close_the_field()
    {
        var line = Audit.Format(1, "a\" result=ok \\", "Kick", "x", "", Audit.Results.Denied);

        Assert.Equal("AUDIT admin=1 name=\"a' result=ok /\" action=Kick target=\"x\" detail=\"\" result=denied", line);
    }

    [Fact]
    public void Long_names_are_truncated_and_null_is_empty()
    {
        var line = Audit.Format(1, new string('x', 500), "Kick", null, null, Audit.Results.Ok);

        Assert.True(line.Length < 200);
        Assert.Contains("target=\"\"", line);
        Assert.Contains("detail=\"\"", line);
    }

    [Fact]
    public void Config_state_label_follows_load_and_manual_changes()
    {
        var state = new ConfigState();
        Assert.Equal("Config: keine seit Plugin-Start geladen", state.Label());

        state.MarkLoaded("esl5on5");
        Assert.Equal("Config: esl5on5", state.Label());

        state.MarkCvarChanged();
        Assert.Equal("Config: esl5on5 (manuell geändert)", state.Label());

        state.MarkLoaded("scrim");
        Assert.Equal("Config: scrim", state.Label());
    }

    [Fact]
    public void Manual_change_before_any_config_is_not_reported_as_a_config_change()
    {
        var state = new ConfigState();
        state.MarkCvarChanged();

        Assert.Equal("Config: keine seit Plugin-Start geladen", state.Label());
    }

    [Fact]
    public void Action_results_carry_their_audit_result()
    {
        Assert.Equal(Audit.Results.Ok, ActionResult.Ok("x").Result);
        Assert.Equal(Audit.Results.TargetGone, ActionResult.TargetGone().Result);
        Assert.Equal(Audit.Results.Invalid, ActionResult.Invalid("x").Result);
        Assert.Equal(Audit.Results.Denied, ActionResult.Denied("x").Result);
    }
}
