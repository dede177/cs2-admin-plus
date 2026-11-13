using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public sealed class ConfigCatalogTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "adminplus-tests-" + Guid.NewGuid().ToString("N"));
    private readonly string _dir;

    public ConfigCatalogTests()
    {
        _dir = Path.Combine(_root, "hstx");
        Directory.CreateDirectory(_dir);
    }

    public void Dispose() => Directory.Delete(_root, true);

    private void Touch(string relativePath)
    {
        var path = Path.Combine(_dir, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, "// test");
    }

    [Fact]
    public void Lists_only_valid_cfg_files_sorted_without_extension()
    {
        Touch("scrim.cfg");
        Touch("esl5on5.cfg");
        Touch("notes.txt");
        Touch("a.cfgx");
        Touch("has space.cfg");
        Touch(".hidden.cfg");
        Touch("sub/inner.cfg");
        Touch("semi;colon.cfg");

        Assert.Equal(new[] { "esl5on5", "scrim" }, ConfigCatalog.List(_dir));
    }

    [Fact]
    public void Missing_directory_gives_an_empty_list()
    {
        Assert.Empty(ConfigCatalog.List(Path.Combine(_root, "does-not-exist")));
    }

    [Fact]
    public void Symlinked_config_is_not_listed()
    {
        Touch("real.cfg");
        try
        {
            File.CreateSymbolicLink(Path.Combine(_dir, "link.cfg"), Path.Combine(_dir, "real.cfg"));
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException or PlatformNotSupportedException)
        {
            return; // symlinks need elevated rights on Windows; the check is exercised on the Linux build host
        }

        Assert.Equal(new[] { "real" }, ConfigCatalog.List(_dir));
    }

    [Fact]
    public void Resolve_builds_an_exec_command_for_a_listed_config()
    {
        Touch("esl5on5.cfg");

        Assert.True(ConfigCatalog.TryResolve(_dir, "hstx", "esl5on5", out var command));
        Assert.Equal("exec hstx/esl5on5", command);
    }

    [Theory]
    [InlineData("../server")]
    [InlineData("..\\server")]
    [InlineData("sub/inner")]
    [InlineData("esl5on5.cfg")]
    [InlineData("ESL5ON5")]
    [InlineData("missing")]
    [InlineData("")]
    [InlineData("esl5on5;quit")]
    [InlineData("esl5on5\nquit")]
    [InlineData("C:\\Windows\\win")]
    public void Resolve_rejects_everything_that_is_not_an_exact_listed_name(string name)
    {
        Touch("esl5on5.cfg");
        Touch("inner.cfg");

        Assert.False(ConfigCatalog.TryResolve(_dir, "hstx", name, out var command));
        Assert.Equal("", command);
    }

    [Theory]
    [InlineData("..")]
    [InlineData("hstx/../x")]
    [InlineData("")]
    [InlineData("a b")]
    [InlineData("hstx\n")]
    public void Resolve_rejects_an_unsafe_folder_name(string folder)
    {
        Touch("esl5on5.cfg");
        Assert.False(ConfigCatalog.TryResolve(_dir, folder, "esl5on5", out _));
    }

    [Theory]
    [InlineData("esl5on5.cfg", true)]
    [InlineData("example-mr12.cfg", true)]
    [InlineData("a..b.cfg", false)]
    [InlineData("-x.cfg", false)]
    [InlineData("x.cfg\n", false)]
    [InlineData("x.CFG", true)]
    public void File_name_rules(string name, bool expected)
    {
        Assert.Equal(expected, ConfigCatalog.IsValidFileName(name));
    }
}
