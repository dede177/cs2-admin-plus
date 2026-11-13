using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class MenuTextTests
{
    [Fact]
    public void Plain_name_is_unchanged_in_chat_menus()
    {
        Assert.Equal("Max Mustermann", MenuText.Label("Max Mustermann", html: false));
    }

    [Fact]
    public void Html_is_encoded_for_center_menus_and_left_alone_for_chat()
    {
        Assert.Equal("Max&lt;br&gt;Kicken", MenuText.Label("Max<br>Kicken", html: true));
        Assert.Equal("Max<br>Kicken", MenuText.Label("Max<br>Kicken", html: false));
        Assert.Equal("&lt;3 &amp; &quot;x&quot;", MenuText.Label("<3 & \"x\"", html: true));
    }

    [Fact]
    public void Long_names_are_truncated_before_encoding()
    {
        var name = new string('a', 100);
        Assert.Equal(MenuText.MaxLength, MenuText.Label(name, html: false).Length);
        Assert.Equal(MenuText.MaxLength, MenuText.Label(name, html: true).Length);
    }

    [Fact]
    public void Control_characters_and_newlines_become_spaces()
    {
        Assert.Equal("a b c", MenuText.Label("a\nb\tc", html: false));
    }

    [Fact]
    public void Null_or_empty_gives_a_placeholder()
    {
        Assert.Equal("?", MenuText.Label(null, html: false));
        Assert.Equal("?", MenuText.Label("   ", html: true));
    }
}
