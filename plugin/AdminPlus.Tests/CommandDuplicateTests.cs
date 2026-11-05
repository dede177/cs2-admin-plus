using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class CommandDuplicateTests
{
    private static readonly DateTime T0 = new(2026, 11, 5, 21, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("!map de_inferno", "css_map de_inferno")]
    [InlineData("/changemap de_anubis", "css_changemap de_anubis")]
    [InlineData("css_map de_inferno", "css_map de_inferno")]
    [InlineData("changelevel de_nuke", "changelevel de_nuke")]
    public void Key_makes_chat_and_console_form_equal(string detail, string expected) =>
        Assert.Equal(expected, CommandDuplicateFilter.Key(detail));

    [Fact]
    public void Chat_line_and_its_css_twin_in_the_same_moment_count_once()
    {
        var filter = new CommandDuplicateFilter();
        Assert.False(filter.IsDuplicate(1, "!map de_inferno", T0));
        Assert.True(filter.IsDuplicate(1, "css_map de_inferno", T0.AddMilliseconds(2)));
    }

    [Fact]
    public void Same_command_after_the_window_is_logged_again()
    {
        var filter = new CommandDuplicateFilter();
        Assert.False(filter.IsDuplicate(1, "!map de_inferno", T0));
        Assert.False(filter.IsDuplicate(1, "!map de_inferno", T0.AddSeconds(5)));
    }

    [Fact]
    public void Other_player_or_other_argument_is_never_a_duplicate()
    {
        var filter = new CommandDuplicateFilter();
        Assert.False(filter.IsDuplicate(1, "!map de_inferno", T0));
        Assert.False(filter.IsDuplicate(2, "css_map de_inferno", T0));
        Assert.False(filter.IsDuplicate(1, "css_map de_nuke", T0));
        Assert.False(filter.IsDuplicate(0, "changelevel de_inferno", T0));
    }

    [Fact]
    public void The_filter_does_not_grow_without_limit()
    {
        var filter = new CommandDuplicateFilter();
        for (int i = 0; i < 1000; i++)
            filter.IsDuplicate((ulong)i, $"!map de_{i}", T0.AddSeconds(i));
        Assert.True(filter.Count <= 64);
    }
}
