using System.Text.Json;
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class MapPackTests
{
    private static AdminPlusConfig Load(string json, out List<string> problems)
    {
        var config = JsonSerializer.Deserialize<AdminPlusConfig>(json)!;
        problems = new List<string>();
        config.Normalize(problems);
        return config;
    }

    [Fact]
    public void Default_config_has_the_esl_pack_and_no_legacy_maps_key()
    {
        var json = JsonSerializer.Serialize(new AdminPlusConfig());
        var config = Load(json, out var problems);

        Assert.Empty(problems);
        var pack = Assert.Single(config.MapPacks);
        Assert.Equal("esl", pack.Name);
        Assert.Equal("ESL Pool", pack.Label);
        Assert.Equal(
            new[] { "de_ancient", "de_anubis", "de_cache", "de_dust2", "de_inferno", "de_mirage", "de_nuke" },
            pack.Maps.Select(m => m.Name));
        using var doc = JsonDocument.Parse(json);
        Assert.False(doc.RootElement.TryGetProperty("Maps", out _));
        Assert.True(doc.RootElement.TryGetProperty("MapPacks", out _));
    }

    [Fact]
    public void Legacy_maps_key_becomes_one_pack_when_no_packs_are_configured()
    {
        var config = Load("""{ "Maps": [ { "Name": "de_mirage", "Label": "Mirage" }, { "Name": "de_nuke" } ] }""", out var problems);

        Assert.Empty(problems);
        var pack = Assert.Single(config.MapPacks);
        Assert.Equal("maps", pack.Name);
        Assert.Equal("Maps", pack.Label);
        Assert.Equal(new[] { "de_mirage", "de_nuke" }, pack.Maps.Select(m => m.Name));
        Assert.Equal("de_nuke", pack.Maps[1].Label);
    }

    [Fact]
    public void Configured_packs_win_over_the_legacy_maps_key()
    {
        var config = Load("""
        {
          "Maps": [ { "Name": "de_nuke" } ],
          "MapPacks": [ { "Name": "a", "Label": "A", "Maps": [ { "Name": "de_dust2" } ] } ]
        }
        """, out var problems);

        Assert.Empty(problems);
        var pack = Assert.Single(config.MapPacks);
        Assert.Equal(new[] { "de_dust2" }, pack.Maps.Select(m => m.Name));
    }

    [Fact]
    public void Packs_keep_their_order_labels_and_workshop_maps()
    {
        var config = Load("""
        {
          "MapPacks": [
            { "Name": "esl", "Label": "ESL Pool", "Maps": [ { "Name": "de_cache", "Label": "Cache" } ] },
            { "Name": "fun", "Label": "Fun-Maps", "Maps": [ { "Name": "aim_homage", "Label": "Aim Homage", "WorkshopId": "3678786768" } ] }
          ]
        }
        """, out var problems);

        Assert.Empty(problems);
        Assert.Equal(new[] { "esl", "fun" }, config.MapPacks.Select(p => p.Name));
        Assert.Equal("Fun-Maps", config.MapPacks[1].Label);
        Assert.True(MapCommands.TryBuild(config.MapPacks[1].Maps[0], out var command));
        Assert.Equal("host_workshop_map 3678786768", command);
    }

    [Fact]
    public void Invalid_maps_are_dropped_from_their_pack_with_a_problem_each()
    {
        var config = Load("""
        {
          "MapPacks": [ { "Name": "a", "Label": "A", "Maps": [
            { "Name": "de_mirage;quit" }, { "Name": "de_nuke" }, { "Name": "x", "WorkshopId": "12;quit" }, 42, null
          ] } ]
        }
        """, out var problems);

        Assert.Equal(new[] { "de_nuke" }, config.MapPacks.Single().Maps.Select(m => m.Name));
        Assert.Equal(3, problems.Count);
    }

    [Fact]
    public void Empty_duplicate_and_unsafe_packs_are_dropped_and_the_rest_survives()
    {
        var config = Load("""
        {
          "MapPacks": [
            { "Name": "ok", "Label": "OK", "Maps": [ { "Name": "de_nuke" } ] },
            { "Name": "ok", "Label": "Doppelt", "Maps": [ { "Name": "de_dust2" } ] },
            { "Name": "leer", "Label": "Leer", "Maps": [] },
            { "Name": "bad name;", "Label": "Boese", "Maps": [ { "Name": "de_nuke" } ] },
            "kaputt", null
          ]
        }
        """, out var problems);

        var pack = Assert.Single(config.MapPacks);
        Assert.Equal("OK", pack.Label);
        Assert.Equal(new[] { "de_nuke" }, pack.Maps.Select(m => m.Name));
        Assert.Equal(4, problems.Count);
    }

    [Fact]
    public void A_pack_without_label_uses_its_name()
    {
        var config = Load("""{ "MapPacks": [ { "Name": "esl", "Maps": [ { "Name": "de_nuke" } ] } ] }""", out _);

        Assert.Equal("esl", config.MapPacks.Single().Label);
    }

    [Fact]
    public void If_every_pack_is_invalid_the_default_esl_pack_is_used_and_logged()
    {
        var config = Load("""{ "MapPacks": [ { "Name": "a", "Maps": [ { "Name": "bad;name" } ] } ] }""", out var problems);

        var pack = Assert.Single(config.MapPacks);
        Assert.Equal("esl", pack.Name);
        Assert.Equal(7, pack.Maps.Count);
        Assert.Contains(problems, p => p.Contains("Standard", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Empty_packs_list_given_explicitly_also_falls_back_to_the_default_pack()
    {
        var config = Load("""{ "MapPacks": [] }""", out var problems);

        Assert.Single(config.MapPacks);
        Assert.NotEmpty(problems);
    }

    [Fact]
    public void A_packs_value_of_the_wrong_json_type_does_not_stop_the_load()
    {
        var config = Load("""{ "MapPacks": "esl" }""", out _);

        Assert.Single(config.MapPacks);
    }

    [Fact]
    public void Example_file_in_the_repo_is_valid_and_has_both_packs()
    {
        string? file = null;
        for (var d = new DirectoryInfo(AppContext.BaseDirectory); d != null && file == null; d = d.Parent)
        {
            var candidate = Path.Combine(d.FullName, "plugin", "AdminPlus", "examples", "AdminPlus.MapPacks.example.json");
            if (File.Exists(candidate)) file = candidate;
        }
        Assert.NotNull(file);

        var config = Load(File.ReadAllText(file!), out var problems);

        Assert.Empty(problems);
        Assert.Equal(new[] { "esl", "fun" }, config.MapPacks.Select(p => p.Name));
        Assert.Equal(new[] { 7, 22 }, config.MapPacks.Select(p => p.Maps.Count));
    }
}
