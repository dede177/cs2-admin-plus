using System.Globalization;
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class CvarWhitelistTests
{
    private static CvarDefinition Choice(string name, params string[] values) =>
        new() { Name = name, Kind = CvarKind.Choice, Values = values.ToList() };

    private static List<CvarDefinition> Sanitize(IEnumerable<CvarDefinition?> defs, out List<string> problems)
    {
        problems = new List<string>();
        return CvarWhitelist.Sanitize(defs, problems);
    }

    [Fact]
    public void Default_whitelist_is_valid()
    {
        var defaults = DefaultCvars.Create();
        var result = Sanitize(defaults, out var problems);

        Assert.Empty(problems);
        Assert.Equal(defaults.Count, result.Count);
    }

    [Fact]
    public void Bool_offers_zero_and_one()
    {
        var def = new CvarDefinition { Name = "mp_friendlyfire", Kind = CvarKind.Bool };
        Assert.Equal(new[] { "0", "1" }, CvarWhitelist.OptionsFor(def));
    }

    [Fact]
    public void Int_range_is_expanded_by_step()
    {
        var def = new CvarDefinition { Name = "bot_quota", Kind = CvarKind.Int, Min = 0, Max = 10, Step = 5 };
        Assert.Equal(new[] { "0", "5", "10" }, CvarWhitelist.OptionsFor(def));
    }

    [Fact]
    public void Float_range_uses_invariant_formatting_under_a_german_culture()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("de-DE");
            var def = new CvarDefinition { Name = "mp_roundtime", Kind = CvarKind.Float, Min = 1.5, Max = 2.5, Step = 0.5 };
            Assert.Equal(new[] { "1.5", "2", "2.5" }, CvarWhitelist.OptionsFor(def));
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }

    [Fact]
    public void Valid_value_builds_a_command()
    {
        var defs = new[] { Choice("mp_maxrounds", "12", "24") };

        Assert.True(CvarWhitelist.TryBuildCommand(defs, "mp_maxrounds", "24", out var command, out _));
        Assert.Equal("mp_maxrounds 24", command);
    }

    [Theory]
    [InlineData("25")]
    [InlineData("")]
    [InlineData("24 ")]
    [InlineData("24;quit")]
    [InlineData("24\nquit")]
    [InlineData("\"24\"")]
    public void Values_outside_the_allowed_options_are_rejected(string value)
    {
        var defs = new[] { Choice("mp_maxrounds", "12", "24") };

        Assert.False(CvarWhitelist.TryBuildCommand(defs, "mp_maxrounds", value, out var command, out var error));
        Assert.Equal("", command);
        Assert.NotEqual("", error);
    }

    [Fact]
    public void Unknown_cvar_is_rejected()
    {
        var defs = new[] { Choice("mp_maxrounds", "12") };
        Assert.False(CvarWhitelist.TryBuildCommand(defs, "mp_roundtime", "2", out _, out _));
    }

    [Theory]
    [InlineData("sv_cheats")]
    [InlineData("SV_CHEATS")]
    [InlineData("rcon_password")]
    [InlineData("sv_password")]
    [InlineData("tv_adminpassword")]
    [InlineData("exec")]
    public void Forbidden_names_are_dropped_even_if_the_config_lists_them(string name)
    {
        var result = Sanitize(new[] { Choice(name, "1") }, out var problems);

        Assert.Empty(result);
        Assert.Single(problems);
    }

    [Theory]
    [InlineData("mp_roundtime;quit")]
    [InlineData("mp_roundtime\n")]
    [InlineData("mp round")]
    [InlineData("")]
    [InlineData("1abc")]
    public void Unsafe_names_are_dropped(string name)
    {
        Assert.Empty(Sanitize(new[] { Choice(name, "1") }, out _));
    }

    [Theory]
    [InlineData("1;quit")]
    [InlineData("1\nquit")]
    [InlineData("1 2")]
    [InlineData("\"1\"")]
    [InlineData("")]
    public void Choice_values_with_command_separators_drop_the_whole_cvar(string value)
    {
        var result = Sanitize(new[] { Choice("mp_maxrounds", "12", value) }, out var problems);

        Assert.Empty(result);
        Assert.Single(problems);
    }

    [Fact]
    public void Bad_config_entries_do_not_crash_and_good_ones_survive()
    {
        var good = Choice("mp_maxrounds", "12", "24");
        var result = Sanitize(new CvarDefinition?[]
        {
            null,
            good,
            Choice("mp_maxrounds", "30"),
            Choice("mp_buytime"),
            new() { Name = "bot_quota", Kind = CvarKind.Int, Min = 10, Max = 0, Step = 1 },
            new() { Name = "mp_c4timer", Kind = CvarKind.Int, Min = 0, Max = 1000, Step = 1 },
            Choice("mp_startmoney", "800", "800"),
        }, out var problems);

        Assert.Single(result);
        Assert.Same(good, result[0]);
        Assert.Equal(6, problems.Count);
    }

    [Fact]
    public void Null_list_is_treated_as_empty()
    {
        Assert.Empty(Sanitize(null!, out var problems));
        Assert.Empty(problems);
    }

    [Fact]
    public void Missing_label_and_category_get_defaults()
    {
        var result = Sanitize(new[] { Choice("mp_maxrounds", "12") }, out _);

        Assert.Equal("mp_maxrounds", result[0].Label);
        Assert.Equal("Sonstige", result[0].Category);
    }
}
