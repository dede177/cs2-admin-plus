using CounterStrikeSharp.API.Core;

namespace CS2_SimpleAdminApi;

/// <summary>Subset of the real interface (names and signatures taken from the shared CS2-SimpleAdminApi.dll).</summary>
public interface ICS2_SimpleAdminApi
{
    event Action? OnSimpleAdminReady;

    void RegisterMenuCategory(string categoryId, string categoryName, string permission);

    void RegisterMenu(string categoryId, string menuId, string menuName,
        Func<CCSPlayerController, MenuContext, object> menuFactory, string? permission, string? commandName);

    void UnregisterMenu(string categoryId, string menuId);

    object CreateMenuWithBack(string title, string categoryId, CCSPlayerController player);

    object CreateMenuWithBack(MenuContext context, CCSPlayerController player);

    void AddMenuOption(object menu, string name, Action<CCSPlayerController> action, bool disabled, string? permission);

    void AddSubMenu(object menu, string name, Func<CCSPlayerController, object> subMenuFactory, bool disabled, string? permission);

    void OpenMenu(object menu, CCSPlayerController player);
}

public class MenuContext
{
    public MenuContext(string categoryId, string menuId, string menuTitle, string permission, string commandName)
    {
        CategoryId = categoryId;
        MenuId = menuId;
        MenuTitle = menuTitle;
        Permission = permission;
        CommandName = commandName;
    }

    public string CategoryId { get; set; }
    public string MenuId { get; set; }
    public string MenuTitle { get; set; }
    public string Permission { get; set; }
    public string CommandName { get; set; }
}
