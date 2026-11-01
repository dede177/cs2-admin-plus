using System.Text.Json;
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class ConfigJsonTests
{
    private static AdminPlusConfig Load(string json) =>
        JsonSerializer.Deserialize<AdminPlusConfig>(json)!;

    [Fact]
    public void Default_config_round_trips_and_is_clean()
    {
        var json = JsonSerializer.Serialize(new AdminPlusConfig());
        var config = Load(json);

        var problems = new List<string>();
        config.Normalize(problems);

        Assert.Empty(problems);
        Assert.Equal(DefaultCvars.Create().Count, config.Cvars.Count);
        Assert.Equal("hstx", config.ConfigDirectory);
        Assert.Equal("chat", config.MenuType);
        Assert.Contains("\"Kind\":\"Choice\"", json);
    }

    [Fact]
    public void Empty_json_object_falls_back_to_the_defaults()
    {
        var config = Load("{}");
        var problems = new List<string>();
        config.Normalize(problems);

        Assert.Empty(problems);
        Assert.NotEmpty(config.Cvars);
        Assert.Single(config.MapPacks);
        Assert.Equal(7, config.MapPacks[0].Maps.Count);
        Assert.NotEmpty(config.Modes);
    }

    [Fact]
    public void Null_lists_do_not_crash_normalization()
    {
        var config = Load("{\"Cvars\":null,\"Maps\":null,\"Modes\":null}");
        var problems = new List<string>();
        config.Normalize(problems);

        Assert.Empty(config.Cvars);
        Assert.Single(config.MapPacks);
        Assert.Empty(config.Modes);
    }

    [Fact]
    public void Bad_entries_are_dropped_with_a_problem_each()
    {
        var config = Load("""
        {
          "ConfigDirectory": "../etc",
          "MenuType": "popup",
          "Cvars": [ { "Name": "sv_cheats", "Kind": "Bool" }, { "Name": "mp_maxrounds", "Kind": "Choice", "Values": ["12"] } ],
          "Maps": [ { "Name": "de_mirage;quit" }, { "Name": "de_nuke" }, null ],
          "Modes": [ { "Name": "x", "GameType": 42, "GameMode": 0 }, { "Name": "ok", "GameType": 0, "GameMode": 1 } ]
        }
        """);

        var problems = new List<string>();
        config.Normalize(problems);

        Assert.Equal("hstx", config.ConfigDirectory);
        Assert.Equal("chat", config.MenuType);
        Assert.Equal(new[] { "mp_maxrounds" }, config.Cvars.Select(c => c.Name));
        Assert.Equal(new[] { "de_nuke" }, config.MapPacks.Single().Maps.Select(m => m.Name));
        Assert.Equal(new[] { "ok" }, config.Modes.Select(m => m.Name));
        Assert.Equal(5, problems.Count);
    }

    private static AdminPlusConfig LoadAndNormalize(string json, out List<string> problems)
    {
        var config = Load(json);
        problems = new List<string>();
        config.Normalize(problems);
        return config;
    }

    [Fact]
    public void Unknown_kind_string_drops_only_that_cvar()
    {
        var config = LoadAndNormalize("""
        { "Cvars": [
            { "Name": "mp_maxrounds", "Kind": "Integer", "Min": 1, "Max": 3, "Step": 1 },
            { "Name": "mp_buytime", "Kind": "Choice", "Values": ["20"] } ] }
        """, out var problems);

        Assert.Equal(new[] { "mp_buytime" }, config.Cvars.Select(c => c.Name));
        Assert.Single(problems);
    }

    [Fact]
    public void Numbers_written_as_strings_are_accepted()
    {
        var config = LoadAndNormalize("""
        { "Cvars": [ { "Name": "bot_quota", "Kind": "Int", "Min": "0", "Max": "10", "Step": "5" } ],
          "Modes": [ { "Name": "wm", "GameType": "0", "GameMode": "2" } ] }
        """, out var problems);

        Assert.Empty(problems);
        Assert.Equal(new[] { "0", "5", "10" }, CvarWhitelist.OptionsFor(config.Cvars.Single()));
        Assert.Equal(2, config.Modes.Single().GameMode);
    }

    [Fact]
    public void Values_written_as_numbers_are_accepted()
    {
        var config = LoadAndNormalize("""
        { "Cvars": [ { "Name": "mp_maxrounds", "Kind": "Choice", "Values": [12, 24, "30"] } ] }
        """, out var problems);

        Assert.Empty(problems);
        Assert.Equal(new[] { "12", "24", "30" }, CvarWhitelist.OptionsFor(config.Cvars.Single()));
    }

    [Fact]
    public void Non_numeric_string_for_a_number_drops_only_that_cvar()
    {
        var config = LoadAndNormalize("""
        { "Cvars": [
            { "Name": "bot_quota", "Kind": "Int", "Min": "fuenf", "Max": 10, "Step": 5 },
            { "Name": "mp_buytime", "Kind": "Choice", "Values": ["20"] } ] }
        """, out var problems);

        Assert.Equal(new[] { "mp_buytime" }, config.Cvars.Select(c => c.Name));
        Assert.Single(problems);
    }

    [Fact]
    public void An_entry_of_the_wrong_json_type_drops_only_that_entry()
    {
        var config = LoadAndNormalize("""
        { "Cvars": [ "garbage", { "Name": "mp_buytime", "Kind": "Choice", "Values": ["20"] } ],
          "Maps": [ 42, { "Name": "de_nuke" } ],
          "Modes": [ true, { "Name": "ok", "GameType": 0, "GameMode": 1 } ] }
        """, out var problems);

        Assert.Equal(new[] { "mp_buytime" }, config.Cvars.Select(c => c.Name));
        Assert.Equal(new[] { "de_nuke" }, config.MapPacks.Single().Maps.Select(m => m.Name));
        Assert.Equal(new[] { "ok" }, config.Modes.Select(m => m.Name));
        Assert.Equal(3, problems.Count);
    }

    [Fact]
    public void A_list_of_the_wrong_json_type_becomes_empty()
    {
        var config = LoadAndNormalize("""{ "Cvars": "mp_maxrounds", "Maps": 7, "Modes": { "Name": "x" } }""", out _);

        Assert.Empty(config.Cvars);
        Assert.Single(config.MapPacks);
        Assert.Empty(config.Modes);
    }

    [Fact]
    public void Top_level_strings_of_the_wrong_type_fall_back_to_defaults()
    {
        var config = LoadAndNormalize("""{ "ConfigDirectory": ["x"], "MenuType": 3 }""", out var problems);

        Assert.Equal("hstx", config.ConfigDirectory);
        Assert.Equal("chat", config.MenuType);
        Assert.Equal(2, problems.Count);
    }
}
