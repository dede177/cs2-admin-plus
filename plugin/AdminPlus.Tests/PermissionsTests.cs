using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class PermissionsTests
{
    private static Func<string, bool> Has(params string[] flags) => flag => flags.Contains(flag);

    [Fact]
    public void Root_can_do_everything()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.True(Permissions.Can(Has("@css/root"), action), action.ToString());
    }

    [Fact]
    public void No_flags_can_do_nothing_and_cannot_open_the_menu()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.False(Permissions.Can(Has(), action), action.ToString());

        Assert.False(Permissions.CanOpenMenu(Has()));
    }

    [Fact]
    public void Kick_flag_covers_moderation_but_not_ban()
    {
        var kick = Has("@css/kick");
        Assert.True(Permissions.Can(kick, MenuAction.Kick));
        Assert.True(Permissions.Can(kick, MenuAction.Mute));
        Assert.True(Permissions.Can(kick, MenuAction.SwitchTeam));
        Assert.True(Permissions.Can(kick, MenuAction.Slay));
        Assert.True(Permissions.Can(kick, MenuAction.Respawn));
        Assert.False(Permissions.Can(kick, MenuAction.Ban));
        Assert.False(Permissions.Can(kick, MenuAction.LoadConfig));
    }

    [Fact]
    public void Changemap_flag_covers_map_mode_and_match_control_but_not_restart()
    {
        var map = Has("@css/changemap");
        Assert.True(Permissions.Can(map, MenuAction.ChangeMap));
        Assert.True(Permissions.Can(map, MenuAction.ChangeMode));
        Assert.True(Permissions.Can(map, MenuAction.MatchPause));
        Assert.True(Permissions.Can(map, MenuAction.MatchResume));
        Assert.True(Permissions.Can(map, MenuAction.WarmupEnd));
        Assert.True(Permissions.Can(map, MenuAction.SwapTeams));
        Assert.False(Permissions.Can(map, MenuAction.MatchRestart));
    }

    [Fact]
    public void Cvar_flag_only_changes_cvars_and_loading_a_config_needs_root()
    {
        var cvar = Has("@css/cvar");
        Assert.True(Permissions.Can(cvar, MenuAction.ChangeCvar));
        Assert.False(Permissions.Can(cvar, MenuAction.LoadConfig));
        Assert.False(Permissions.Can(cvar, MenuAction.Kick));
    }

    [Fact]
    public void A_single_unrelated_flag_does_not_open_the_menu()
    {
        Assert.False(Permissions.CanOpenMenu(Has("@css/chat")));
        Assert.True(Permissions.CanOpenMenu(Has("@css/cvar")));
    }

    [Fact]
    public void Every_action_has_a_required_flag()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.False(string.IsNullOrEmpty(Permissions.RequiredFlag(action)), action.ToString());
    }

    [Fact]
    public void Undefined_action_is_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Permissions.RequiredFlag((MenuAction)999));
    }

    [Fact]
    public void Panel_commands_run_from_console_or_with_root_only()
    {
        Assert.True(Permissions.AllowsPanelCommand(true, Has()));
        Assert.True(Permissions.AllowsPanelCommand(false, Has("@css/root")));
        Assert.False(Permissions.AllowsPanelCommand(false, Has("@css/kick", "@css/ban")));
    }

    [Fact]
    public void Only_kick_and_ban_need_a_target_check()
    {
        Assert.True(Targeting.NeedsTargetCheck(MenuAction.Kick));
        Assert.True(Targeting.NeedsTargetCheck(MenuAction.Ban));
        Assert.False(Targeting.NeedsTargetCheck(MenuAction.Mute));
    }

    [Fact]
    public void Admin_cannot_target_self_or_higher_immunity()
    {
        Assert.True(Targeting.IsAllowed(3, 7, true));
        Assert.False(Targeting.IsAllowed(3, 3, true));
        Assert.False(Targeting.IsAllowed(3, 7, false));
    }

    [Fact]
    public void Gate_skips_the_target_check_for_actions_that_do_not_need_one()
    {
        bool called = false;
        var block = Targeting.Gate(MenuAction.Mute, 7, _ => { called = true; return ActionResult.Denied("x"); });

        Assert.Null(block);
        Assert.False(called);
    }

    [Fact]
    public void Gate_blocks_kick_and_ban_without_a_target()
    {
        var block = Targeting.Gate(MenuAction.Kick, null, _ => ActionResult.Ok(""));

        Assert.NotNull(block);
        Assert.Equal(Audit.Results.Invalid, block!.Value.Result);
    }

    [Fact]
    public void Gate_passes_through_a_failed_target_check_and_lets_a_passed_one_run()
    {
        var denied = ActionResult.Denied("nope");
        Assert.Equal(denied, Targeting.Gate(MenuAction.Ban, 7, _ => denied));
        Assert.Equal(ActionResult.TargetGone(), Targeting.Gate(MenuAction.Kick, 7, _ => ActionResult.TargetGone()));
        Assert.Null(Targeting.Gate(MenuAction.Kick, 7, _ => ActionResult.Ok("")));
    }
}
