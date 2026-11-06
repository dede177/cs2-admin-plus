using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class BridgeMenusTests
{
    [Fact]
    public void Entries_have_unique_ids_titles_and_css_permissions()
    {
        Assert.NotEmpty(BridgeMenus.All);
        Assert.Equal(BridgeMenus.All.Count, BridgeMenus.All.Select(e => e.Id).Distinct().Count());
        Assert.Equal(BridgeMenus.All.Count, BridgeMenus.All.Select(e => e.Title).Distinct().Count());
        Assert.All(BridgeMenus.All, e =>
        {
            Assert.StartsWith(BridgeMenus.CategoryId + "_", e.Id);
            Assert.StartsWith("@css/", e.Permission);
            Assert.False(string.IsNullOrWhiteSpace(e.Title));
        });
        Assert.StartsWith("@css/", BridgeMenus.CategoryPermission);
    }

    [Fact]
    public void Menu_entries_match_the_permissions_of_the_menu_actions()
    {
        // Same flags as Permissions.cs: map/match = changemap, settings = cvar.
        Assert.Equal("@css/changemap", BridgeMenus.All.Single(e => e.Id == "adminplus_maps").Permission);
        Assert.Equal("@css/cvar", BridgeMenus.All.Single(e => e.Id == "adminplus_settings").Permission);
        Assert.Equal("@css/changemap", BridgeMenus.All.Single(e => e.Id == "adminplus_match").Permission);
    }
}
