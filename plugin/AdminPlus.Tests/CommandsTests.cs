using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class CommandsTests
{
    [Fact]
    public void Kick_uses_the_userid()
    {
        Assert.Equal("kickid 7", ModerationCommands.Kick(7));
    }

    [Fact]
    public void Ban_builds_banid_and_writeid()
    {
        Assert.True(ModerationCommands.TryBan(7, 60, out var commands));
        Assert.Equal(new[] { "banid 60 7 kick", "writeid" }, commands);
    }

    [Fact]
    public void Ban_zero_minutes_is_permanent_and_allowed()
    {
        Assert.True(ModerationCommands.TryBan(7, 0, out var commands));
        Assert.Equal("banid 0 7 kick", commands[0]);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(ModerationCommands.MaxBanMinutes + 1)]
    [InlineData(int.MaxValue)]
    [InlineData(int.MinValue)]
    public void Ban_rejects_out_of_range_durations(int minutes)
    {
        Assert.False(ModerationCommands.TryBan(7, minutes, out var commands));
        Assert.Empty(commands);
    }

    [Fact]
    public void Map_by_name_uses_changelevel()
    {
        Assert.True(MapCommands.TryBuild(new MapEntry { Name = "de_mirage" }, out var command));
        Assert.Equal("changelevel de_mirage", command);
    }

    [Fact]
    public void Workshop_map_uses_the_workshop_id()
    {
        Assert.True(MapCommands.TryBuild(new MapEntry { Name = "aim_redline", WorkshopId = "3070284539" }, out var command));
        Assert.Equal("host_workshop_map 3070284539", command);
    }

    [Theory]
    [InlineData("de_mirage;quit", "")]
    [InlineData("de mirage", "")]
    [InlineData("DE_MIRAGE", "")]
    [InlineData("", "")]
    [InlineData("de_mirage", "123abc")]
    [InlineData("de_mirage", "1;quit")]
    [InlineData("de_mirage", "123\n")]
    public void Map_entries_with_unsafe_values_are_rejected(string name, string workshopId)
    {
        Assert.False(MapCommands.TryBuild(new MapEntry { Name = name, WorkshopId = workshopId }, out var command));
        Assert.Equal("", command);
    }

    [Fact]
    public void Mode_change_sets_type_mode_and_reloads_the_current_map()
    {
        var mode = new ModeDefinition { Name = "wingman", GameType = 0, GameMode = 2 };

        Assert.True(MapCommands.TryBuildMode(mode, "de_inferno", out var commands));
        Assert.Equal(new[] { "game_type 0", "game_mode 2", "changelevel de_inferno" }, commands);
    }

    [Theory]
    [InlineData("workshop/3070284539/aim_redline")]
    [InlineData("")]
    [InlineData("de_inferno;quit")]
    public void Mode_change_is_refused_when_the_current_map_is_not_a_plain_map_name(string currentMap)
    {
        var mode = new ModeDefinition { GameType = 0, GameMode = 1 };

        Assert.False(MapCommands.TryBuildMode(mode, currentMap, out var commands));
        Assert.Empty(commands);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, 10)]
    [InlineData(99, 99)]
    public void Mode_numbers_outside_zero_to_nine_are_rejected(int type, int mode)
    {
        var def = new ModeDefinition { GameType = type, GameMode = mode };
        Assert.False(MapCommands.TryBuildMode(def, "de_dust2", out _));
    }

    [Fact]
    public void Match_actions_map_to_their_commands_and_other_actions_to_null()
    {
        Assert.Equal("mp_pause_match", MatchCommands.For(MenuAction.MatchPause));
        Assert.Equal("mp_unpause_match", MatchCommands.For(MenuAction.MatchResume));
        Assert.Equal("mp_warmup_end", MatchCommands.For(MenuAction.WarmupEnd));
        Assert.Equal("mp_swapteams", MatchCommands.For(MenuAction.SwapTeams));
        Assert.Equal("mp_restartgame 1", MatchCommands.For(MenuAction.MatchRestart));
        Assert.Null(MatchCommands.For(MenuAction.Kick));
    }

    [Fact]
    public void Default_maps_are_the_esl_active_duty_pool_in_alphabetical_order()
    {
        Assert.Equal(
            new[] { "de_ancient", "de_anubis", "de_cache", "de_dust2", "de_inferno", "de_mirage", "de_nuke" },
            DefaultCatalog.Maps().Select(m => m.Name));
    }

    [Fact]
    public void Default_maps_and_modes_are_all_valid()
    {
        foreach (var map in DefaultCatalog.Maps())
            Assert.True(MapCommands.TryBuild(map, out _), map.Name);

        foreach (var mode in DefaultCatalog.Modes())
            Assert.True(MapCommands.TryBuildMode(mode, "de_dust2", out _), mode.Name);
    }
}
