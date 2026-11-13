using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class BotSlotsTests
{
    [Theory]
    [InlineData(20, 0, 18)]
    [InlineData(20, 5, 13)]
    [InlineData(20, 18, 0)]
    [InlineData(20, 20, 0)]
    [InlineData(12, 3, 7)]
    public void Bots_may_fill_everything_except_the_reserved_slots(int max, int humans, int expected) =>
        Assert.Equal(expected, BotSlots.AllowedBots(max, humans, reserved: 2));

    [Fact]
    public void Excess_bots_are_the_ones_over_the_allowed_number()
    {
        Assert.Equal(0, BotSlots.ExcessBots(20, humans: 2, bots: 10, reserved: 2));
        Assert.Equal(0, BotSlots.ExcessBots(20, humans: 2, bots: 16, reserved: 2));
        Assert.Equal(4, BotSlots.ExcessBots(20, humans: 2, bots: 20, reserved: 2));
        Assert.Equal(2, BotSlots.ExcessBots(20, humans: 15, bots: 5, reserved: 2));
    }

    [Fact]
    public void Zero_reserved_slots_switches_the_rule_off()
    {
        Assert.Equal(0, BotSlots.ExcessBots(20, humans: 2, bots: 18, reserved: 0));
        Assert.Equal(0, BotSlots.ExcessBots(20, humans: 0, bots: 99, reserved: -1));
    }

    [Fact]
    public void Unknown_max_players_never_kicks_anyone()
    {
        Assert.Equal(0, BotSlots.ExcessBots(0, humans: 0, bots: 5, reserved: 2));
    }

    [Theory]
    [InlineData(2, 2, true)]
    [InlineData(0, 0, true)]
    [InlineData(8, 8, true)]
    [InlineData(-1, 2, false)]
    [InlineData(9, 2, false)]
    public void Reserved_value_must_be_between_0_and_8(int input, int expected, bool valid)
    {
        Assert.Equal(valid, BotSlots.IsValidReserved(input));
        Assert.Equal(expected, BotSlots.NormalizeReserved(input));
    }
}
