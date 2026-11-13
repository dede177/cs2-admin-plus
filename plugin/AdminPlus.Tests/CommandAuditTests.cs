using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class CommandAuditTests
{
    [Theory]
    [InlineData("css_map", "de_inferno", "css_map de_inferno")]
    [InlineData("css_changemap", "de_anubis", "css_changemap de_anubis")]
    [InlineData("css_wsmap", "3070244462", "css_wsmap 3070244462")]
    [InlineData("changelevel", "de_nuke", "changelevel de_nuke")]
    [InlineData("map", "de_dust2", "map de_dust2")]
    [InlineData("host_workshop_map", "3263935964", "host_workshop_map 3263935964")]
    [InlineData("CSS_MAP", "de_mirage", "css_map de_mirage")]
    public void Map_commands_from_console_are_recognised(string command, string args, string expected)
    {
        var hit = CommandAudit.Classify(command, args);
        Assert.NotNull(hit);
        Assert.Equal(expected, hit!.Value.Detail);
    }

    [Theory]
    [InlineData("!map de_inferno", "!map de_inferno")]
    [InlineData("/changemap de_anubis", "/changemap de_anubis")]
    [InlineData("!wsmap 123", "!wsmap 123")]
    [InlineData("\"!map de_inferno\"", "!map de_inferno")]
    public void Chat_triggers_are_recognised(string text, string expected)
    {
        var hit = CommandAudit.Classify("say", text);
        Assert.NotNull(hit);
        Assert.Equal(expected, hit!.Value.Detail);
        Assert.NotNull(CommandAudit.Classify("say_team", text));
    }

    [Theory]
    [InlineData("say", "hello there")]
    [InlineData("say", "!bots")]
    [InlineData("say", "map de_dust2")]
    [InlineData("css_kick", "someone")]
    [InlineData("sv_cheats", "1")]
    [InlineData("say", "")]
    [InlineData("", "")]
    public void Everything_else_is_ignored(string command, string args) =>
        Assert.Null(CommandAudit.Classify(command, args));

    [Fact]
    public void Rcon_is_logged_but_secrets_are_hidden()
    {
        var plain = CommandAudit.Classify("css_rcon", "changelevel de_nuke");
        Assert.Equal("css_rcon changelevel de_nuke", plain!.Value.Detail);

        var secret = CommandAudit.Classify("css_rcon", "rcon_password hunter2");
        Assert.DoesNotContain("hunter2", secret!.Value.Detail);

        var chat = CommandAudit.Classify("say", "!rcon sv_password geheim");
        Assert.DoesNotContain("geheim", chat!.Value.Detail);
    }

    [Fact]
    public void Action_name_is_stable()
    {
        Assert.Equal("MapCommand", CommandAudit.Classify("css_map", "de_dust2")!.Value.Action);
        Assert.Equal("MapCommand", CommandAudit.Classify("say", "!map de_dust2")!.Value.Action);
    }
}
