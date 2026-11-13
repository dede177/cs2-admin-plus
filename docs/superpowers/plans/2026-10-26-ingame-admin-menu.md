# Ingame-Admin-Menü Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AdminPlus bekommt ein `!admin`-Menü, mit dem berechtigte Admins Spieler, Map und Modus, Cvars, Server-Configs und das Match direkt im Spiel steuern.

**Architecture:** Alles bleibt eine Assembly (`AdminPlus.dll`). Reine Logik (Rechte, Cvar-Whitelist, Config-Katalog, Audit, Befehlsbau) liegt in `plugin/AdminPlus/Logic/` ohne CounterStrikeSharp-Typen und wird per xUnit getestet. Die Glue-Schicht (`AdminActions`, `AdminGate`, Menüs) nutzt diese Logik, jede Menüaktion läuft durch genau eine Stelle (`AdminPlus.Execute`), die Recht prüft, ausführt und auditiert. Die 12 `sm_*`-Befehle des Web-Panels wandern unverändert in `PanelCommands.cs`.

**Tech Stack:** C# / .NET 8, CounterStrikeSharp.API 1.0.367, xUnit 2.9.2, eingebaute CSS-Menüs (`ChatMenu`, `CenterHtmlMenu`).

**Spec:** `docs/superpowers/specs/2026-10-26-ingame-admin-menu-design.md` (committed auf `feat/ingame-admin-menu`). Wer den Plan ausführt, liest beide.

## Global Constraints

- Zielframework `net8.0`, Paket `CounterStrikeSharp.API` Version `1.0.367`.
- Das Plugin bleibt **eine Assembly** `AdminPlus.dll`. `build-plugin.sh` liefert nur diese DLL. Zusätzlich existiert nur das Testprojekt `plugin/AdminPlus.Tests`, es wird nie ausgeliefert.
- Die bestehenden `sm_*`-Befehle ändern ihr Verhalten nicht. Einzige Ausnahme ist die Absicherung in Task 12, und sie darf erst nach Task 11 umgesetzt werden.
- Cvar-Whitelist: `sv_cheats`, `rcon_password`, `sv_password` sind nie änderbar. Keine freie Cvar- oder Pfadeingabe.
- Configs werden nur aus `game/csgo/cfg/hstx/` geladen, nur `.cfg`, nur per Auswahl aus der Liste (Recht `@css/root`).
- Rechte-Zuordnung wie Spec Abschnitt 5: Kick, Mute, Team, Slay, Respawn = `@css/kick`; Ban = `@css/ban`; Map, Modus, Pause, Fortsetzen, Warmup beenden, Teams tauschen = `@css/changemap`; Cvar = `@css/cvar`; Config laden und Match-Neustart = `@css/root`. `@css/root` darf alles.
- Auditzeile je Menüaktion: `AUDIT admin=<SteamID64> name=<Name> action=<Aktion> target=<Ziel> detail=<Wert> result=<ok|denied|target_gone|invalid|error>`.
- Menüs sind die eingebauten CounterStrikeSharp-Menüs, keine Community-Bibliothek. Texte für Admins sind deutsch.
- **Nichts am Server ohne ausdrückliche Freigabe des Nutzers unmittelbar davor.** Die Produktivserver Public, GunGame und War werden nicht angefasst. Keine Secrets (RCON, API-Secret, `.env`) lesen oder ausgeben.
- Arbeitsverzeichnis für alle Befehle ist die Repo-Wurzel `C:\Users\thilo\OneDrive - Hardstylistixx\Mein Netzwerk\HSTX-eSport\cs2-admin-plus` auf dem Branch `feat/ingame-admin-menu`.
- Auf diesem Rechner ist keine NuGet-Quelle eingetragen. Bricht ein Befehl mit `NU1100` ab, einmal `dotnet restore <Projekt> --source https://api.nuget.org/v3/index.json` ausführen (ändert keine globale Konfiguration).

## Review Focus

Eingaben und Zustände, die die Spec nur andeutet und die im Betrieb am ehesten Schaden anrichten. Jede Zeile hat einen Test in dem Task, der den Code besitzt:

1. Werte aus `AdminPlus.json` mit `;`, Zeilenumbruch, Anführungszeichen oder Leerzeichen dürfen nie als Konsolenbefehl durchgehen, sondern werfen den Eintrag weg (Task 2, Task 5).
2. Kommazahlen unter deutscher Systemkultur: `1,92` statt `1.92` würde die Cvar zerstören, Formatierung ist immer invariant (Task 2).
3. Spielernamen mit Zeilenumbruch, `"` oder `result=ok` dürfen keine zweite oder gefälschte Auditzeile erzeugen (Task 4).
4. Config-Namen: `..`, Unterordner, falsche Groß/Kleinschreibung auf dem case-sensitiven Linux-Server, `.cfgx`, Leerzeichen, Symlink, verbotener Ordnername (Task 3).
5. Kaputte oder teilweise falsche `AdminPlus.json`: `null`-Listen, doppelte oder verbotene Einträge, ungültiger Ordner oder `MenuType` darf das Plugin nicht abstürzen lassen (Task 6). Extreme Banndauern werden abgelehnt (Task 5).

Nicht per Unit-Test prüfbar und deshalb in Task 11 am Test-Server geprüft: Ziel verlässt den Server zwischen Auswahl und Ausführung, Verhalten bei syntaktisch ungültigem JSON, echte Wirkung von `banid`, Voice-Mute und Moduswechsel.

---

### Task 1: Testprojekt und Rechte-Logik

**Files:**
- Create: `plugin/AdminPlus.Tests/AdminPlus.Tests.csproj`
- Create: `plugin/AdminPlus.Tests/PermissionsTests.cs`
- Create: `plugin/AdminPlus/Logic/Permissions.cs`

**Interfaces:**
- Consumes: nichts.
- Produces: `enum MenuAction` (Kick, Ban, Mute, SwitchTeam, Slay, Respawn, ChangeMap, ChangeMode, ChangeCvar, LoadConfig, MatchPause, MatchResume, WarmupEnd, SwapTeams, MatchRestart); `static class Permissions` mit `const string Root`, `string RequiredFlag(MenuAction)`, `bool Can(Func<string,bool> hasFlag, MenuAction)`, `bool CanOpenMenu(Func<string,bool>)`, `bool AllowsPanelCommand(bool callerIsConsole, Func<string,bool> hasFlag)`; `static class Targeting` mit `bool NeedsTargetCheck(MenuAction)` und `bool IsAllowed(int adminUserId, int targetUserId, bool immunityAllows)`. Alle im Namespace `AdminPlus.Logic`.

- [ ] **Step 1: Testprojekt anlegen**

`plugin/AdminPlus.Tests/AdminPlus.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\AdminPlus\AdminPlus.csproj" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Failing test schreiben**

`plugin/AdminPlus.Tests/PermissionsTests.cs`:

```csharp
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class PermissionsTests
{
    private static Func<string, bool> Has(params string[] flags) => flag => flags.Contains(flag);

    [Fact]
    public void Root_can_do_everything()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.True(Permissions.Can(Has("@css/root"), action), action.ToString());
    }

    [Fact]
    public void No_flags_can_do_nothing_and_cannot_open_the_menu()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.False(Permissions.Can(Has(), action), action.ToString());

        Assert.False(Permissions.CanOpenMenu(Has()));
    }

    [Fact]
    public void Kick_flag_covers_moderation_but_not_ban()
    {
        var kick = Has("@css/kick");
        Assert.True(Permissions.Can(kick, MenuAction.Kick));
        Assert.True(Permissions.Can(kick, MenuAction.Mute));
        Assert.True(Permissions.Can(kick, MenuAction.SwitchTeam));
        Assert.True(Permissions.Can(kick, MenuAction.Slay));
        Assert.True(Permissions.Can(kick, MenuAction.Respawn));
        Assert.False(Permissions.Can(kick, MenuAction.Ban));
        Assert.False(Permissions.Can(kick, MenuAction.LoadConfig));
    }

    [Fact]
    public void Changemap_flag_covers_map_mode_and_match_control_but_not_restart()
    {
        var map = Has("@css/changemap");
        Assert.True(Permissions.Can(map, MenuAction.ChangeMap));
        Assert.True(Permissions.Can(map, MenuAction.ChangeMode));
        Assert.True(Permissions.Can(map, MenuAction.MatchPause));
        Assert.True(Permissions.Can(map, MenuAction.MatchResume));
        Assert.True(Permissions.Can(map, MenuAction.WarmupEnd));
        Assert.True(Permissions.Can(map, MenuAction.SwapTeams));
        Assert.False(Permissions.Can(map, MenuAction.MatchRestart));
    }

    [Fact]
    public void Cvar_flag_only_changes_cvars_and_loading_a_config_needs_root()
    {
        var cvar = Has("@css/cvar");
        Assert.True(Permissions.Can(cvar, MenuAction.ChangeCvar));
        Assert.False(Permissions.Can(cvar, MenuAction.LoadConfig));
        Assert.False(Permissions.Can(cvar, MenuAction.Kick));
    }

    [Fact]
    public void A_single_unrelated_flag_does_not_open_the_menu()
    {
        Assert.False(Permissions.CanOpenMenu(Has("@css/chat")));
        Assert.True(Permissions.CanOpenMenu(Has("@css/cvar")));
    }

    [Fact]
    public void Every_action_has_a_required_flag()
    {
        foreach (var action in Enum.GetValues<MenuAction>())
            Assert.False(string.IsNullOrEmpty(Permissions.RequiredFlag(action)), action.ToString());
    }

    [Fact]
    public void Undefined_action_is_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Permissions.RequiredFlag((MenuAction)999));
    }

    [Fact]
    public void Panel_commands_run_from_console_or_with_root_only()
    {
        Assert.True(Permissions.AllowsPanelCommand(true, Has()));
        Assert.True(Permissions.AllowsPanelCommand(false, Has("@css/root")));
        Assert.False(Permissions.AllowsPanelCommand(false, Has("@css/kick", "@css/ban")));
    }

    [Fact]
    public void Only_kick_and_ban_need_a_target_check()
    {
        Assert.True(Targeting.NeedsTargetCheck(MenuAction.Kick));
        Assert.True(Targeting.NeedsTargetCheck(MenuAction.Ban));
        Assert.False(Targeting.NeedsTargetCheck(MenuAction.Mute));
    }

    [Fact]
    public void Admin_cannot_target_self_or_higher_immunity()
    {
        Assert.True(Targeting.IsAllowed(3, 7, true));
        Assert.False(Targeting.IsAllowed(3, 3, true));
        Assert.False(Targeting.IsAllowed(3, 7, false));
    }
}
```

- [ ] **Step 3: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet restore plugin/AdminPlus.Tests --source https://api.nuget.org/v3/index.json` und danach `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0234` ("Der Typ- oder Namespacename "Logic" ist im Namespace "AdminPlus" nicht vorhanden"). Das ist der erwartete Fehlschlag.

- [ ] **Step 4: Implementierung schreiben**

`plugin/AdminPlus/Logic/Permissions.cs`:

```csharp
namespace AdminPlus.Logic;

public enum MenuAction
{
    Kick, Ban, Mute, SwitchTeam, Slay, Respawn,
    ChangeMap, ChangeMode,
    ChangeCvar, LoadConfig,
    MatchPause, MatchResume, WarmupEnd, SwapTeams, MatchRestart,
}

public static class Permissions
{
    public const string Root = "@css/root";

    public static string RequiredFlag(MenuAction action) => action switch
    {
        MenuAction.Kick or MenuAction.Mute or MenuAction.SwitchTeam
            or MenuAction.Slay or MenuAction.Respawn => "@css/kick",
        MenuAction.Ban => "@css/ban",
        MenuAction.ChangeMap or MenuAction.ChangeMode or MenuAction.MatchPause
            or MenuAction.MatchResume or MenuAction.WarmupEnd or MenuAction.SwapTeams => "@css/changemap",
        MenuAction.ChangeCvar => "@css/cvar",
        MenuAction.LoadConfig or MenuAction.MatchRestart => Root,
        _ => throw new ArgumentOutOfRangeException(nameof(action)),
    };

    public static bool Can(Func<string, bool> hasFlag, MenuAction action) =>
        hasFlag(Root) || hasFlag(RequiredFlag(action));

    public static bool CanOpenMenu(Func<string, bool> hasFlag) =>
        Enum.GetValues<MenuAction>().Any(action => Can(hasFlag, action));

    public static bool AllowsPanelCommand(bool callerIsConsole, Func<string, bool> hasFlag) =>
        callerIsConsole || hasFlag(Root);
}

public static class Targeting
{
    public static bool NeedsTargetCheck(MenuAction action) =>
        action is MenuAction.Kick or MenuAction.Ban;

    public static bool IsAllowed(int adminUserId, int targetUserId, bool immunityAllows) =>
        adminUserId != targetUserId && immunityAllows;
}
```

- [ ] **Step 5: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`, alle Tests aus `PermissionsTests` grün.

- [ ] **Step 6: Commit**

```powershell
git add plugin/AdminPlus.Tests plugin/AdminPlus/Logic/Permissions.cs
git commit -m "feat: add permission mapping and targeting rules with tests" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Cvar-Whitelist

**Files:**
- Create: `plugin/AdminPlus/Logic/CvarWhitelist.cs`
- Create: `plugin/AdminPlus/Logic/DefaultCvars.cs`
- Test: `plugin/AdminPlus.Tests/CvarWhitelistTests.cs`

**Interfaces:**
- Consumes: nichts aus früheren Tasks.
- Produces: `enum CvarKind { Bool, Int, Float, Choice }`; `class CvarDefinition` (Name, Label, Category, Kind, Values, Min, Max, Step, alle mit `[JsonPropertyName]`); `static class CvarWhitelist` mit `const int MaxOptions = 24`, `bool IsForbidden(string)`, `bool IsNameSafe(string?)`, `bool IsValueSafe(string?)`, `IReadOnlyList<string> OptionsFor(CvarDefinition)`, `List<CvarDefinition> Sanitize(IEnumerable<CvarDefinition?>?, List<string> problems)`, `bool TryBuildCommand(IEnumerable<CvarDefinition>, string name, string value, out string command, out string error)`; `static class DefaultCvars` mit `List<CvarDefinition> Create()`.

- [ ] **Step 1: Failing test schreiben**

`plugin/AdminPlus.Tests/CvarWhitelistTests.cs`:

```csharp
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
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0246` für `CvarDefinition`, `CvarKind`, `CvarWhitelist` und `DefaultCvars`.

- [ ] **Step 3: Implementierung schreiben**

`plugin/AdminPlus/Logic/CvarWhitelist.cs`:

```csharp
using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public enum CvarKind { Bool, Int, Float, Choice }

public sealed class CvarDefinition
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";
    [JsonPropertyName("Category")] public string Category { get; set; } = "";

    [JsonPropertyName("Kind")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CvarKind Kind { get; set; } = CvarKind.Choice;

    [JsonPropertyName("Values")] public List<string> Values { get; set; } = new();
    [JsonPropertyName("Min")] public double Min { get; set; }
    [JsonPropertyName("Max")] public double Max { get; set; }
    [JsonPropertyName("Step")] public double Step { get; set; } = 1;
}

public static class CvarWhitelist
{
    public const int MaxOptions = 24;

    private static readonly Regex NameRx =
        new(@"^[a-z_][a-z0-9_]{0,63}\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex ValueRx =
        new(@"^[A-Za-z0-9_.\-]{1,32}\z", RegexOptions.CultureInvariant);

    private static readonly HashSet<string> Forbidden = new(StringComparer.OrdinalIgnoreCase)
    {
        "sv_cheats", "rcon_password", "sv_password", "sv_setsteamaccount", "exec", "quit", "exit",
    };

    public static bool IsForbidden(string name) =>
        Forbidden.Contains(name)
        || name.Contains("password", StringComparison.OrdinalIgnoreCase)
        || name.Contains("cheat", StringComparison.OrdinalIgnoreCase);

    public static bool IsNameSafe(string? name) =>
        name != null && NameRx.IsMatch(name) && !IsForbidden(name);

    public static bool IsValueSafe(string? value) =>
        value != null && ValueRx.IsMatch(value);

    private static string Format(double v) =>
        Math.Round(v, 4).ToString("0.####", CultureInfo.InvariantCulture);

    public static IReadOnlyList<string> OptionsFor(CvarDefinition d)
    {
        switch (d.Kind)
        {
            case CvarKind.Bool:
                return new[] { "0", "1" };
            case CvarKind.Choice:
                return d.Values ?? new List<string>();
            default:
                var list = new List<string>();
                if (d.Step <= 0 || d.Max < d.Min) return list;
                for (int i = 0; i <= MaxOptions; i++)
                {
                    double v = d.Min + i * d.Step;
                    if (v > d.Max + 1e-9) break;
                    list.Add(d.Kind == CvarKind.Int
                        ? ((long)Math.Round(v)).ToString(CultureInfo.InvariantCulture)
                        : Format(v));
                }
                return list;
        }
    }

    public static List<CvarDefinition> Sanitize(IEnumerable<CvarDefinition?>? defs, List<string> problems)
    {
        var result = new List<CvarDefinition>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var d in defs ?? Enumerable.Empty<CvarDefinition?>())
        {
            if (d == null) { problems.Add("Cvar-Eintrag ist leer"); continue; }
            if (!IsNameSafe(d.Name)) { problems.Add($"Cvar '{d.Name}': Name unzulässig oder verboten"); continue; }
            if (!seen.Add(d.Name)) { problems.Add($"Cvar '{d.Name}': doppelt"); continue; }

            var options = OptionsFor(d);
            if (options.Count == 0) { problems.Add($"Cvar '{d.Name}': keine Werte"); continue; }
            if (options.Count > MaxOptions) { problems.Add($"Cvar '{d.Name}': mehr als {MaxOptions} Werte"); continue; }
            if (options.Any(o => !IsValueSafe(o))) { problems.Add($"Cvar '{d.Name}': unzulässiger Wert"); continue; }
            if (options.Distinct(StringComparer.Ordinal).Count() != options.Count) { problems.Add($"Cvar '{d.Name}': doppelte Werte"); continue; }

            if (string.IsNullOrWhiteSpace(d.Label)) d.Label = d.Name;
            if (string.IsNullOrWhiteSpace(d.Category)) d.Category = "Sonstige";
            result.Add(d);
        }

        return result;
    }

    public static bool TryBuildCommand(
        IEnumerable<CvarDefinition> defs, string name, string value, out string command, out string error)
    {
        command = "";
        error = "";

        var def = defs.FirstOrDefault(d => string.Equals(d.Name, name, StringComparison.OrdinalIgnoreCase));
        if (def == null || !IsNameSafe(def.Name)) { error = "Cvar nicht in der Whitelist."; return false; }
        if (!IsValueSafe(value) || !OptionsFor(def).Contains(value, StringComparer.Ordinal))
        {
            error = "Wert nicht erlaubt.";
            return false;
        }

        command = $"{def.Name} {value}";
        return true;
    }
}
```

`plugin/AdminPlus/Logic/DefaultCvars.cs`:

```csharp
namespace AdminPlus.Logic;

public static class DefaultCvars
{
    private static CvarDefinition Choice(string name, string label, string category, params string[] values) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Choice, Values = values.ToList() };

    private static CvarDefinition Bool(string name, string label, string category) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Bool };

    private static CvarDefinition Int(string name, string label, string category, int min, int max, int step) =>
        new() { Name = name, Label = label, Category = category, Kind = CvarKind.Int, Min = min, Max = max, Step = step };

    public static List<CvarDefinition> Create() => new()
    {
        Choice("mp_roundtime", "Rundenzeit (Min)", "Runden", "1.92", "2", "2.5", "3", "5"),
        Choice("mp_roundtime_defuse", "Rundenzeit Defuse (Min)", "Runden", "1.92", "2", "2.5", "3", "5"),
        Int("mp_freezetime", "Freezetime (s)", "Runden", 5, 20, 5),
        Choice("mp_maxrounds", "Max. Runden", "Runden", "12", "16", "24", "30"),
        Choice("mp_c4timer", "C4-Timer (s)", "Runden", "40", "45"),

        Choice("mp_startmoney", "Startgeld", "Wirtschaft", "800", "2500", "10000", "16000"),
        Choice("mp_buytime", "Kaufzeit (s)", "Wirtschaft", "15", "20", "30", "45", "60", "90"),
        Choice("mp_afterroundmoney", "Geld nach Runde", "Wirtschaft", "0", "1000", "5000"),

        Bool("mp_friendlyfire", "Friendly Fire", "Regeln"),
        Bool("mp_autoteambalance", "Auto-Teambalance", "Regeln"),
        Int("mp_limitteams", "Max. Teamunterschied", "Regeln", 0, 2, 1),
        Bool("mp_overtime_enable", "Overtime", "Regeln"),
        Bool("sv_alltalk", "Alltalk", "Regeln"),

        Choice("mp_warmuptime", "Warmup-Zeit (s)", "Warmup", "30", "60", "120", "300"),
        Bool("mp_warmup_pausetimer", "Warmup-Timer pausieren", "Warmup"),

        Int("bot_quota", "Bots", "Bots", 0, 10, 5),
        Int("bot_difficulty", "Bot-Schwierigkeit", "Bots", 0, 3, 1),
    };
}
```

Hinweis: In den Regexen steht bewusst `\z` und nicht `$`. `$` ließe `mp_roundtime\n` durch.

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`.

- [ ] **Step 5: Commit**

```powershell
git add plugin/AdminPlus/Logic/CvarWhitelist.cs plugin/AdminPlus/Logic/DefaultCvars.cs plugin/AdminPlus.Tests/CvarWhitelistTests.cs
git commit -m "feat: add cvar whitelist with validation and default set" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Config-Katalog

**Files:**
- Create: `plugin/AdminPlus/Logic/ConfigCatalog.cs`
- Test: `plugin/AdminPlus.Tests/ConfigCatalogTests.cs`

**Interfaces:**
- Consumes: nichts aus früheren Tasks.
- Produces: `static class ConfigCatalog` mit `bool IsValidFolder(string?)`, `bool IsValidFileName(string?)` (erwartet inklusive `.cfg`), `IReadOnlyList<string> List(string directory)` (Namen ohne Endung, sortiert), `bool TryResolve(string directory, string folder, string name, out string execCommand)` (Beispiel-Ergebnis `exec hstx/esl5on5`).

- [ ] **Step 1: Failing test schreiben**

`plugin/AdminPlus.Tests/ConfigCatalogTests.cs`:

```csharp
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
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0103`/`CS0246` für `ConfigCatalog`.

- [ ] **Step 3: Implementierung schreiben**

`plugin/AdminPlus/Logic/ConfigCatalog.cs`:

```csharp
using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public static class ConfigCatalog
{
    private static readonly Regex FileRx =
        new(@"^[A-Za-z0-9][A-Za-z0-9_.\-]{0,59}\.cfg\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex FolderRx =
        new(@"^[A-Za-z0-9_\-]{1,32}\z", RegexOptions.CultureInvariant);

    public static bool IsValidFolder(string? folder) => folder != null && FolderRx.IsMatch(folder);

    public static bool IsValidFileName(string? fileName) =>
        fileName != null && FileRx.IsMatch(fileName) && !fileName.Contains("..", StringComparison.Ordinal);

    public static IReadOnlyList<string> List(string directory)
    {
        if (!Directory.Exists(directory)) return Array.Empty<string>();

        var names = new List<string>();
        foreach (var path in Directory.EnumerateFiles(directory, "*.cfg", SearchOption.TopDirectoryOnly))
        {
            var fileName = Path.GetFileName(path);
            if (!IsValidFileName(fileName)) continue;
            if (new FileInfo(path).Attributes.HasFlag(FileAttributes.ReparsePoint)) continue;
            names.Add(Path.GetFileNameWithoutExtension(fileName));
        }

        names.Sort(StringComparer.OrdinalIgnoreCase);
        return names;
    }

    public static bool TryResolve(string directory, string folder, string name, out string execCommand)
    {
        execCommand = "";
        if (!IsValidFolder(folder)) return false;
        if (!IsValidFileName(name + ".cfg")) return false;
        if (!List(directory).Contains(name, StringComparer.Ordinal)) return false;

        execCommand = $"exec {folder}/{name}";
        return true;
    }
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`. Der Symlink-Test endet unter Windows ohne Rechte früh mit Erfolg, er prüft nur auf dem Linux-Buildhost.

- [ ] **Step 5: Commit**

```powershell
git add plugin/AdminPlus/Logic/ConfigCatalog.cs plugin/AdminPlus.Tests/ConfigCatalogTests.cs
git commit -m "feat: add config catalog restricted to a fixed cfg folder" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Audit, ActionResult und Config-Zustand

**Files:**
- Create: `plugin/AdminPlus/Logic/Audit.cs`
- Create: `plugin/AdminPlus/Logic/ActionResult.cs`
- Create: `plugin/AdminPlus/Logic/ConfigState.cs`
- Test: `plugin/AdminPlus.Tests/AuditTests.cs`

**Interfaces:**
- Consumes: nichts aus früheren Tasks.
- Produces: `static class Audit` mit `Audit.Results.{Ok,Denied,TargetGone,Invalid,Error}` (Strings) und `string Format(ulong adminSteamId, string? adminName, string action, string? target, string? detail, string result)`; `readonly record struct ActionResult(string Result, string Message)` mit `Ok(string)`, `TargetGone()`, `Invalid(string)`, `Denied(string)`; `class ConfigState` mit `LastConfig`, `ManuallyChanged`, `MarkLoaded(string)`, `MarkCvarChanged()`, `Label()`.

- [ ] **Step 1: Failing test schreiben**

`plugin/AdminPlus.Tests/AuditTests.cs`:

```csharp
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class AuditTests
{
    [Fact]
    public void Line_has_the_agreed_format()
    {
        var line = Audit.Format(76561198000000000, "Thilo", "Kick", "Max", "", Audit.Results.Ok);

        Assert.Equal(
            "AUDIT admin=76561198000000000 name=\"Thilo\" action=Kick target=\"Max\" detail=\"\" result=ok",
            line);
    }

    [Fact]
    public void Newlines_in_a_player_name_cannot_create_a_second_log_line()
    {
        var line = Audit.Format(1, "Evil\nAUDIT admin=2 result=ok", "Kick", "x", "", Audit.Results.Denied);

        Assert.DoesNotContain('\n', line);
        Assert.DoesNotContain('\r', line);
    }

    [Fact]
    public void Quotes_and_backslashes_in_a_name_cannot_close_the_field()
    {
        var line = Audit.Format(1, "a\" result=ok \\", "Kick", "x", "", Audit.Results.Denied);

        Assert.Equal("AUDIT admin=1 name=\"a' result=ok /\" action=Kick target=\"x\" detail=\"\" result=denied", line);
    }

    [Fact]
    public void Long_names_are_truncated_and_null_is_empty()
    {
        var line = Audit.Format(1, new string('x', 500), "Kick", null, null, Audit.Results.Ok);

        Assert.True(line.Length < 200);
        Assert.Contains("target=\"\"", line);
        Assert.Contains("detail=\"\"", line);
    }

    [Fact]
    public void Config_state_label_follows_load_and_manual_changes()
    {
        var state = new ConfigState();
        Assert.Equal("Config: keine seit Plugin-Start geladen", state.Label());

        state.MarkLoaded("esl5on5");
        Assert.Equal("Config: esl5on5", state.Label());

        state.MarkCvarChanged();
        Assert.Equal("Config: esl5on5 (manuell geändert)", state.Label());

        state.MarkLoaded("scrim");
        Assert.Equal("Config: scrim", state.Label());
    }

    [Fact]
    public void Manual_change_before_any_config_is_not_reported_as_a_config_change()
    {
        var state = new ConfigState();
        state.MarkCvarChanged();

        Assert.Equal("Config: keine seit Plugin-Start geladen", state.Label());
    }

    [Fact]
    public void Action_results_carry_their_audit_result()
    {
        Assert.Equal(Audit.Results.Ok, ActionResult.Ok("x").Result);
        Assert.Equal(Audit.Results.TargetGone, ActionResult.TargetGone().Result);
        Assert.Equal(Audit.Results.Invalid, ActionResult.Invalid("x").Result);
        Assert.Equal(Audit.Results.Denied, ActionResult.Denied("x").Result);
    }
}
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0103`/`CS0246` für `Audit`, `ConfigState`, `ActionResult`.

- [ ] **Step 3: Implementierung schreiben**

`plugin/AdminPlus/Logic/Audit.cs`:

```csharp
namespace AdminPlus.Logic;

public static class Audit
{
    public static class Results
    {
        public const string Ok = "ok";
        public const string Denied = "denied";
        public const string TargetGone = "target_gone";
        public const string Invalid = "invalid";
        public const string Error = "error";
    }

    private const int MaxFieldLength = 64;

    public static string Format(ulong adminSteamId, string? adminName, string action, string? target, string? detail, string result) =>
        $"AUDIT admin={adminSteamId} name={Quote(adminName)} action={action} target={Quote(target)} detail={Quote(detail)} result={result}";

    private static string Quote(string? value)
    {
        var chars = (value ?? "").Select(c => c switch
        {
            '"' => '\'',
            '\\' => '/',
            _ when char.IsControl(c) => ' ',
            _ => c,
        });

        var text = new string(chars.ToArray());
        if (text.Length > MaxFieldLength) text = text[..MaxFieldLength];
        return $"\"{text}\"";
    }
}
```

`plugin/AdminPlus/Logic/ActionResult.cs`:

```csharp
namespace AdminPlus.Logic;

public readonly record struct ActionResult(string Result, string Message)
{
    public static ActionResult Ok(string message) => new(Audit.Results.Ok, message);
    public static ActionResult TargetGone() => new(Audit.Results.TargetGone, "Spieler nicht mehr auf dem Server.");
    public static ActionResult Invalid(string message) => new(Audit.Results.Invalid, message);
    public static ActionResult Denied(string message) => new(Audit.Results.Denied, message);
}
```

`plugin/AdminPlus/Logic/ConfigState.cs`:

```csharp
namespace AdminPlus.Logic;

public sealed class ConfigState
{
    public string? LastConfig { get; private set; }
    public bool ManuallyChanged { get; private set; }

    public void MarkLoaded(string name)
    {
        LastConfig = name;
        ManuallyChanged = false;
    }

    public void MarkCvarChanged() => ManuallyChanged = true;

    public string Label() =>
        LastConfig is null ? "Config: keine seit Plugin-Start geladen"
        : ManuallyChanged ? $"Config: {LastConfig} (manuell geändert)"
        : $"Config: {LastConfig}";
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`.

- [ ] **Step 5: Commit**

```powershell
git add plugin/AdminPlus/Logic/Audit.cs plugin/AdminPlus/Logic/ActionResult.cs plugin/AdminPlus/Logic/ConfigState.cs plugin/AdminPlus.Tests/AuditTests.cs
git commit -m "feat: add audit line format, action result and config state" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Befehlsbau für Moderation, Map, Modus und Match

**Files:**
- Create: `plugin/AdminPlus/Logic/Catalog.cs`
- Create: `plugin/AdminPlus/Logic/GameCommands.cs`
- Test: `plugin/AdminPlus.Tests/CommandsTests.cs`

**Interfaces:**
- Consumes: `MenuAction` aus Task 1.
- Produces: `class MapEntry` (Name, Label, WorkshopId), `class ModeDefinition` (Name, Label, GameType, GameMode), `static class DefaultCatalog` mit `Maps()` und `Modes()`; `static class ModerationCommands` mit `const int MaxBanMinutes`, `string Kick(int userId)`, `bool TryBan(int userId, int minutes, out string[] commands)`; `static class MapCommands` mit `bool IsValidMapName(string?)`, `bool TryBuild(MapEntry, out string command)`, `bool TryBuildMode(ModeDefinition, string currentMap, out string[] commands)`; `static class MatchCommands` mit `string? For(MenuAction)`.

- [ ] **Step 1: Failing test schreiben**

`plugin/AdminPlus.Tests/CommandsTests.cs`:

```csharp
using AdminPlus.Logic;
using Xunit;

namespace AdminPlus.Tests;

public class CommandsTests
{
    [Fact]
    public void Kick_uses_the_userid()
    {
        Assert.Equal("kickid 7", ModerationCommands.Kick(7));
    }

    [Fact]
    public void Ban_builds_banid_and_writeid()
    {
        Assert.True(ModerationCommands.TryBan(7, 60, out var commands));
        Assert.Equal(new[] { "banid 60 7 kick", "writeid" }, commands);
    }

    [Fact]
    public void Ban_zero_minutes_is_permanent_and_allowed()
    {
        Assert.True(ModerationCommands.TryBan(7, 0, out var commands));
        Assert.Equal("banid 0 7 kick", commands[0]);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(ModerationCommands.MaxBanMinutes + 1)]
    [InlineData(int.MaxValue)]
    [InlineData(int.MinValue)]
    public void Ban_rejects_out_of_range_durations(int minutes)
    {
        Assert.False(ModerationCommands.TryBan(7, minutes, out var commands));
        Assert.Empty(commands);
    }

    [Fact]
    public void Map_by_name_uses_changelevel()
    {
        Assert.True(MapCommands.TryBuild(new MapEntry { Name = "de_mirage" }, out var command));
        Assert.Equal("changelevel de_mirage", command);
    }

    [Fact]
    public void Workshop_map_uses_the_workshop_id()
    {
        Assert.True(MapCommands.TryBuild(new MapEntry { Name = "aim_redline", WorkshopId = "3070284539" }, out var command));
        Assert.Equal("host_workshop_map 3070284539", command);
    }

    [Theory]
    [InlineData("de_mirage;quit", "")]
    [InlineData("de mirage", "")]
    [InlineData("DE_MIRAGE", "")]
    [InlineData("", "")]
    [InlineData("de_mirage", "123abc")]
    [InlineData("de_mirage", "1;quit")]
    [InlineData("de_mirage", "123\n")]
    public void Map_entries_with_unsafe_values_are_rejected(string name, string workshopId)
    {
        Assert.False(MapCommands.TryBuild(new MapEntry { Name = name, WorkshopId = workshopId }, out var command));
        Assert.Equal("", command);
    }

    [Fact]
    public void Mode_change_sets_type_mode_and_reloads_the_current_map()
    {
        var mode = new ModeDefinition { Name = "wingman", GameType = 0, GameMode = 2 };

        Assert.True(MapCommands.TryBuildMode(mode, "de_inferno", out var commands));
        Assert.Equal(new[] { "game_type 0", "game_mode 2", "changelevel de_inferno" }, commands);
    }

    [Theory]
    [InlineData("workshop/3070284539/aim_redline")]
    [InlineData("")]
    [InlineData("de_inferno;quit")]
    public void Mode_change_is_refused_when_the_current_map_is_not_a_plain_map_name(string currentMap)
    {
        var mode = new ModeDefinition { GameType = 0, GameMode = 1 };

        Assert.False(MapCommands.TryBuildMode(mode, currentMap, out var commands));
        Assert.Empty(commands);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, 10)]
    [InlineData(99, 99)]
    public void Mode_numbers_outside_zero_to_nine_are_rejected(int type, int mode)
    {
        var def = new ModeDefinition { GameType = type, GameMode = mode };
        Assert.False(MapCommands.TryBuildMode(def, "de_dust2", out _));
    }

    [Fact]
    public void Match_actions_map_to_their_commands_and_other_actions_to_null()
    {
        Assert.Equal("mp_pause_match", MatchCommands.For(MenuAction.MatchPause));
        Assert.Equal("mp_unpause_match", MatchCommands.For(MenuAction.MatchResume));
        Assert.Equal("mp_warmup_end", MatchCommands.For(MenuAction.WarmupEnd));
        Assert.Equal("mp_swapteams", MatchCommands.For(MenuAction.SwapTeams));
        Assert.Equal("mp_restartgame 1", MatchCommands.For(MenuAction.MatchRestart));
        Assert.Null(MatchCommands.For(MenuAction.Kick));
    }

    [Fact]
    public void Default_maps_and_modes_are_all_valid()
    {
        foreach (var map in DefaultCatalog.Maps())
            Assert.True(MapCommands.TryBuild(map, out _), map.Name);

        foreach (var mode in DefaultCatalog.Modes())
            Assert.True(MapCommands.TryBuildMode(mode, "de_dust2", out _), mode.Name);
    }
}
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0103`/`CS0246` für `ModerationCommands`, `MapCommands`, `MatchCommands`, `MapEntry`, `ModeDefinition`, `DefaultCatalog`.

- [ ] **Step 3: Implementierung schreiben**

`plugin/AdminPlus/Logic/Catalog.cs`:

```csharp
using System.Text.Json.Serialization;

namespace AdminPlus.Logic;

public sealed class MapEntry
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";
    [JsonPropertyName("WorkshopId")] public string WorkshopId { get; set; } = "";
}

public sealed class ModeDefinition
{
    [JsonPropertyName("Name")] public string Name { get; set; } = "";
    [JsonPropertyName("Label")] public string Label { get; set; } = "";
    [JsonPropertyName("GameType")] public int GameType { get; set; }
    [JsonPropertyName("GameMode")] public int GameMode { get; set; }
}

public static class DefaultCatalog
{
    private static MapEntry Map(string name, string label) => new() { Name = name, Label = label };

    public static List<MapEntry> Maps() => new()
    {
        Map("de_mirage", "Mirage"), Map("de_inferno", "Inferno"), Map("de_ancient", "Ancient"),
        Map("de_anubis", "Anubis"), Map("de_dust2", "Dust 2"), Map("de_nuke", "Nuke"),
        Map("de_overpass", "Overpass"), Map("de_vertigo", "Vertigo"),
    };

    public static List<ModeDefinition> Modes() => new()
    {
        new() { Name = "competitive", Label = "Competitive", GameType = 0, GameMode = 1 },
        new() { Name = "wingman", Label = "Wingman", GameType = 0, GameMode = 2 },
        new() { Name = "casual", Label = "Casual", GameType = 0, GameMode = 0 },
        new() { Name = "deathmatch", Label = "Deathmatch", GameType = 1, GameMode = 2 },
    };
}
```

`plugin/AdminPlus/Logic/GameCommands.cs`:

```csharp
using System.Globalization;
using System.Text.RegularExpressions;

namespace AdminPlus.Logic;

public static class ModerationCommands
{
    public const int MaxBanMinutes = 525600;

    public static string Kick(int userId) => $"kickid {userId.ToString(CultureInfo.InvariantCulture)}";

    public static bool TryBan(int userId, int minutes, out string[] commands)
    {
        commands = Array.Empty<string>();
        if (minutes < 0 || minutes > MaxBanMinutes) return false;

        var id = userId.ToString(CultureInfo.InvariantCulture);
        var min = minutes.ToString(CultureInfo.InvariantCulture);
        commands = new[] { $"banid {min} {id} kick", "writeid" };
        return true;
    }
}

public static class MapCommands
{
    private static readonly Regex MapRx = new(@"^[a-z0-9_]{1,64}\z", RegexOptions.CultureInvariant);
    private static readonly Regex WorkshopRx = new(@"^[0-9]{1,20}\z", RegexOptions.CultureInvariant);

    public static bool IsValidMapName(string? name) => name != null && MapRx.IsMatch(name);

    public static bool TryBuild(MapEntry map, out string command)
    {
        command = "";

        if (!string.IsNullOrEmpty(map.WorkshopId))
        {
            if (!WorkshopRx.IsMatch(map.WorkshopId)) return false;
            command = $"host_workshop_map {map.WorkshopId}";
            return true;
        }

        if (!IsValidMapName(map.Name)) return false;
        command = $"changelevel {map.Name}";
        return true;
    }

    public static bool TryBuildMode(ModeDefinition mode, string currentMap, out string[] commands)
    {
        commands = Array.Empty<string>();
        if (mode.GameType is < 0 or > 9 || mode.GameMode is < 0 or > 9) return false;
        if (!IsValidMapName(currentMap)) return false;

        commands = new[]
        {
            $"game_type {mode.GameType.ToString(CultureInfo.InvariantCulture)}",
            $"game_mode {mode.GameMode.ToString(CultureInfo.InvariantCulture)}",
            $"changelevel {currentMap}",
        };
        return true;
    }
}

public static class MatchCommands
{
    public static string? For(MenuAction action) => action switch
    {
        MenuAction.MatchPause => "mp_pause_match",
        MenuAction.MatchResume => "mp_unpause_match",
        MenuAction.WarmupEnd => "mp_warmup_end",
        MenuAction.SwapTeams => "mp_swapteams",
        MenuAction.MatchRestart => "mp_restartgame 1",
        _ => null,
    };
}
```

Hinweis: Die Befehle `kickid`, `banid`, `writeid`, `changelevel`, `host_workshop_map`, `game_type`, `game_mode` und `mp_*` sind bis Task 11 Annahmen. Sie stehen absichtlich an genau dieser einen Stelle, damit eine Korrektur nach der Verifikation nur diese Datei und ihre Tests betrifft.

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`.

- [ ] **Step 5: Commit**

```powershell
git add plugin/AdminPlus/Logic/Catalog.cs plugin/AdminPlus/Logic/GameCommands.cs plugin/AdminPlus.Tests/CommandsTests.cs
git commit -m "feat: add validated builders for kick, ban, map, mode and match commands" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Plugin-Konfiguration

**Files:**
- Create: `plugin/AdminPlus/Config/AdminPlusConfig.cs`
- Test: `plugin/AdminPlus.Tests/ConfigJsonTests.cs`

**Interfaces:**
- Consumes: `CvarDefinition`, `CvarWhitelist`, `DefaultCvars` (Task 2), `ConfigCatalog.IsValidFolder` (Task 3), `MapEntry`, `ModeDefinition`, `DefaultCatalog`, `MapCommands` (Task 5).
- Produces: `class AdminPlusConfig : BasePluginConfig` mit `ConfigDirectory` (Standard `hstx`), `MenuType` (`chat` oder `center`, Standard `chat`), `Cvars`, `Maps`, `Modes` und `void Normalize(List<string> problems)`, das ungültige Einträge entfernt und je Eintrag einen Problemtext anhängt. Namespace `AdminPlus`.

- [ ] **Step 1: Failing test schreiben**

`plugin/AdminPlus.Tests/ConfigJsonTests.cs`:

```csharp
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
        Assert.NotEmpty(config.Maps);
        Assert.NotEmpty(config.Modes);
    }

    [Fact]
    public void Null_lists_do_not_crash_normalization()
    {
        var config = Load("{\"Cvars\":null,\"Maps\":null,\"Modes\":null}");
        var problems = new List<string>();
        config.Normalize(problems);

        Assert.Empty(config.Cvars);
        Assert.Empty(config.Maps);
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
        Assert.Equal(new[] { "de_nuke" }, config.Maps.Select(m => m.Name));
        Assert.Equal(new[] { "ok" }, config.Modes.Select(m => m.Name));
        Assert.Equal(5, problems.Count);
    }
}
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: Buildfehler `CS0246` für `AdminPlusConfig`.

- [ ] **Step 3: Implementierung schreiben**

`plugin/AdminPlus/Config/AdminPlusConfig.cs`:

```csharp
using System.Text.Json.Serialization;
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public class AdminPlusConfig : BasePluginConfig
{
    [JsonPropertyName("ConfigDirectory")] public string ConfigDirectory { get; set; } = "hstx";
    [JsonPropertyName("MenuType")] public string MenuType { get; set; } = "chat";
    [JsonPropertyName("Cvars")] public List<CvarDefinition> Cvars { get; set; } = DefaultCvars.Create();
    [JsonPropertyName("Maps")] public List<MapEntry> Maps { get; set; } = DefaultCatalog.Maps();
    [JsonPropertyName("Modes")] public List<ModeDefinition> Modes { get; set; } = DefaultCatalog.Modes();

    public void Normalize(List<string> problems)
    {
        Cvars = CvarWhitelist.Sanitize(Cvars, problems);

        Maps = (Maps ?? new List<MapEntry>()).Where(m => m != null).ToList();
        Maps.RemoveAll(m =>
        {
            var ok = MapCommands.TryBuild(m, out _);
            if (!ok) problems.Add($"Map '{m.Name}': ungültig");
            return !ok;
        });
        foreach (var m in Maps.Where(m => string.IsNullOrWhiteSpace(m.Label))) m.Label = m.Name;

        Modes = (Modes ?? new List<ModeDefinition>()).Where(m => m != null).ToList();
        Modes.RemoveAll(m =>
        {
            var ok = MapCommands.TryBuildMode(m, "de_dust2", out _);
            if (!ok) problems.Add($"Modus '{m.Name}': ungültig");
            return !ok;
        });
        foreach (var m in Modes.Where(m => string.IsNullOrWhiteSpace(m.Label))) m.Label = m.Name;

        if (!ConfigCatalog.IsValidFolder(ConfigDirectory))
        {
            problems.Add($"ConfigDirectory '{ConfigDirectory}' ungültig, verwende 'hstx'");
            ConfigDirectory = "hstx";
        }

        if (MenuType != "chat" && MenuType != "center")
        {
            problems.Add($"MenuType '{MenuType}' ungültig, verwende 'chat'");
            MenuType = "chat";
        }
    }
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `dotnet test plugin/AdminPlus.Tests`
Expected: `Bestanden! Fehler: 0`, insgesamt 103 Tests.

- [ ] **Step 5: Plugin bauen**

Run: `dotnet build plugin/AdminPlus -c Release`
Expected: `Der Buildvorgang wurde erfolgreich ausgeführt`, 0 Warnungen, 0 Fehler.

- [ ] **Step 6: Commit**

```powershell
git add plugin/AdminPlus/Config plugin/AdminPlus.Tests/ConfigJsonTests.cs
git commit -m "feat: add AdminPlus plugin configuration with normalisation" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: AdminPlus.cs aufteilen (Panel-Befehle unverändert)

Reiner Umbau, kein Verhaltenswechsel. Statt eines Tests belegt ein Vergleichsskript, dass der Befehlsblock zeichengleich verschoben wurde.

**Files:**
- Create: `plugin/AdminPlus/PanelCommands.cs`
- Modify: `plugin/AdminPlus/AdminPlus.cs` (komplett ersetzt)

**Interfaces:**
- Consumes: `AdminPlusConfig` (Task 6), `ConfigState` (Task 4).
- Produces: `public partial class AdminPlus : BasePlugin, IPluginConfig<AdminPlusConfig>` mit `Config`, privatem `_configState`, `CfgRoot`, `ConfigFolderPath` und der Methode `OnConfigParsed`. `PanelCommands.cs` enthält die 12 `sm_*`-Befehle und `sm_playerinfo_all` (13 `[ConsoleCommand]`).

- [ ] **Step 1: Ausgangsstand sichern**

```powershell
git show HEAD:plugin/AdminPlus/AdminPlus.cs | Set-Content "$env:TEMP\AdminPlus.before.cs" -Encoding utf8
(Select-String -Path "$env:TEMP\AdminPlus.before.cs" -Pattern '\[ConsoleCommand\("').Count
```

Expected: `13`.

- [ ] **Step 2: PanelCommands.cs aus der alten Datei erzeugen**

Die Zeilen 21 bis 285 der bisherigen `AdminPlus.cs` (von `// ─── Helpers` bis zur Klammer nach `OnSlap`) werden in eine `partial class` verschoben:

```powershell
$orig = Get-Content "plugin/AdminPlus/AdminPlus.cs"
if ($orig.Count -ne 286) { throw "AdminPlus.cs hat $($orig.Count) Zeilen statt 286 - Plan nicht anwendbar" }

$header = @'
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

public partial class AdminPlus
{
'@ -split "`r?`n"

$panel = @($header) + $orig[20..284] + '}'
$panel | Set-Content "plugin/AdminPlus/PanelCommands.cs" -Encoding utf8
```

- [ ] **Step 3: AdminPlus.cs durch den neuen Kern ersetzen**

`plugin/AdminPlus/AdminPlus.cs` (gesamter Inhalt, ohne `css_admin`, das kommt in Task 9):

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Cvars;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus : BasePlugin, IPluginConfig<AdminPlusConfig>
{
    public override string ModuleName        => "AdminPlus";
    public override string ModuleVersion     => "1.1.0";
    public override string ModuleAuthor      => "dede177";
    public override string ModuleDescription => "Web admin panel command bridge and ingame admin menu";

    public AdminPlusConfig Config { get; set; } = new();

    private readonly ConfigState _configState = new();
    private bool _cvarNamesChecked;

    public void OnConfigParsed(AdminPlusConfig config)
    {
        var problems = new List<string>();
        config.Normalize(problems);
        Config = config;

        foreach (var problem in problems)
            Logger.LogWarning("AdminPlus config: {Problem}", problem);
    }

    public override void Load(bool hotReload)
    {
        RegisterListener<Listeners.OnMapStart>(_ => CheckCvarNames());

        Console.WriteLine("[AdminPlus] ✅ Loaded — all sm_ commands registered.");
    }

    private void CheckCvarNames()
    {
        if (_cvarNamesChecked) return;
        _cvarNamesChecked = true;

        foreach (var cvar in Config.Cvars.Where(c => ConVar.Find(c.Name) == null))
            Logger.LogWarning("AdminPlus config: Cvar '{Name}' existiert auf diesem Server nicht", cvar.Name);
    }

    /// <summary>Absolute path of game/csgo/cfg, derived from the plugin directory.</summary>
    private string CfgRoot => Path.GetFullPath(Path.Combine(ModuleDirectory, "..", "..", "..", "..", "cfg"));

    private string ConfigFolderPath => Path.Combine(CfgRoot, Config.ConfigDirectory);
}
```

- [ ] **Step 4: Verschiebung belegen**

```powershell
$before = Get-Content "$env:TEMP\AdminPlus.before.cs"
$after = Get-Content "plugin/AdminPlus/PanelCommands.cs"
$moved = $after[10..274]
"Abweichungen im verschobenen Block: " + @(Compare-Object $before[20..284] $moved).Count
"ConsoleCommand vorher/nachher: " + @($before | Select-String '\[ConsoleCommand\("').Count + "/" + @($after | Select-String '\[ConsoleCommand\("').Count
```

Expected: `Abweichungen im verschobenen Block: 0` und `ConsoleCommand vorher/nachher: 13/13`. Bei etwas anderem: stoppen, Ursache klären, nicht weitermachen.

- [ ] **Step 5: Bauen und alle Tests laufen lassen**

Run: `dotnet build plugin/AdminPlus -c Release` und `dotnet test plugin/AdminPlus.Tests`
Expected: Build ohne Fehler und Warnungen, `Bestanden! Fehler: 0`.

- [ ] **Step 6: Commit**

```powershell
git add plugin/AdminPlus/AdminPlus.cs plugin/AdminPlus/PanelCommands.cs
git commit -m "refactor: move panel commands verbatim into PanelCommands and add config loading" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Aktionen und zentrale Ausführungsstelle

Glue-Code gegen die Spiel-API. Er ist ohne laufendes Spiel nicht testbar, die Logik darunter ist es (Tasks 1 bis 6). Verifiziert wird per Build, die Wirkung in Task 11.

**Files:**
- Create: `plugin/AdminPlus/AdminActions.cs`
- Create: `plugin/AdminPlus/AdminGate.cs`

**Interfaces:**
- Consumes: alle `Logic`-Typen aus Tasks 1 bis 5, `ConfigState` (Task 4), `Config`, `_configState`, `ConfigFolderPath` aus Task 7.
- Produces: `internal static class AdminActions` mit `Find(int)`, `HumanPlayers()`, `Respawn(int)`, `SwitchTeam(int, CsTeam, string)`, `Slay(int)`, `ToggleMute(int)`, `Kick(int)`, `Ban(int, int)`, `ChangeMap(MapEntry)`, `ChangeMode(ModeDefinition)`, `SetCvar(IEnumerable<CvarDefinition>, string, string, ConfigState)`, `LoadConfig(string directory, string folder, string name, ConfigState)`, `Match(MenuAction, string label)`; alle liefern `ActionResult`. In `AdminPlus` (partial): `bool Can(CCSPlayerController, MenuAction)`, `void Execute(CCSPlayerController admin, MenuAction action, string target, string detail, Func<ActionResult> run)`, `ActionResult CheckTarget(CCSPlayerController admin, int targetUserId)`.

- [ ] **Step 1: AdminActions schreiben**

`plugin/AdminPlus/AdminActions.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

/// <summary>Actions triggered by the ingame menu. The panel's sm_ commands are separate and unchanged.</summary>
internal static class AdminActions
{
    public static CCSPlayerController? Find(int userId) =>
        Utilities.GetPlayers().FirstOrDefault(p => p.IsValid && !p.IsBot && p.UserId == userId);

    public static IEnumerable<CCSPlayerController> HumanPlayers() =>
        Utilities.GetPlayers().Where(p => p.IsValid && !p.IsBot && p.UserId.HasValue);

    public static ActionResult Respawn(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.Respawn();
        return ActionResult.Ok($"{player.PlayerName} respawnt.");
    }

    public static ActionResult SwitchTeam(int userId, CsTeam team, string teamLabel)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.SwitchTeam(team);
        return ActionResult.Ok($"{player.PlayerName} ist jetzt {teamLabel}.");
    }

    public static ActionResult Slay(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        player.CommitSuicide(false, true);
        return ActionResult.Ok($"{player.PlayerName} wurde getötet.");
    }

    public static ActionResult ToggleMute(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        bool muted = (player.VoiceFlags & VoiceFlags.Muted) != 0;
        player.VoiceFlags = muted ? VoiceFlags.Normal : VoiceFlags.Muted;
        return ActionResult.Ok($"{player.PlayerName} ist {(muted ? "nicht mehr gemutet" : "gemutet")}.");
    }

    public static ActionResult Kick(int userId)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();

        Server.ExecuteCommand(ModerationCommands.Kick(userId));
        return ActionResult.Ok($"{player.PlayerName} wurde gekickt.");
    }

    public static ActionResult Ban(int userId, int minutes)
    {
        var player = Find(userId);
        if (player == null) return ActionResult.TargetGone();
        if (!ModerationCommands.TryBan(userId, minutes, out var commands))
            return ActionResult.Invalid("Ungültige Banndauer.");

        var name = player.PlayerName;
        foreach (var command in commands) Server.ExecuteCommand(command);
        return ActionResult.Ok($"{name} wurde gebannt ({(minutes == 0 ? "permanent" : $"{minutes} Min")}).");
    }

    public static ActionResult ChangeMap(MapEntry map)
    {
        if (!MapCommands.TryBuild(map, out var command))
            return ActionResult.Invalid("Ungültiger Map-Eintrag.");

        Server.ExecuteCommand(command);
        return ActionResult.Ok($"Mapwechsel auf {map.Label}.");
    }

    public static ActionResult ChangeMode(ModeDefinition mode)
    {
        if (!MapCommands.TryBuildMode(mode, Server.MapName, out var commands))
            return ActionResult.Invalid("Moduswechsel nur auf einer normalen Map möglich. Erst eine Map wählen.");

        foreach (var command in commands) Server.ExecuteCommand(command);
        return ActionResult.Ok($"Modus {mode.Label}, Map wird neu geladen.");
    }

    public static ActionResult SetCvar(IEnumerable<CvarDefinition> defs, string name, string value, ConfigState state)
    {
        if (!CvarWhitelist.TryBuildCommand(defs, name, value, out var command, out var error))
            return ActionResult.Invalid(error);

        Server.ExecuteCommand(command);
        state.MarkCvarChanged();
        return ActionResult.Ok($"{name} = {value}");
    }

    public static ActionResult LoadConfig(string directory, string folder, string name, ConfigState state)
    {
        if (!ConfigCatalog.TryResolve(directory, folder, name, out var command))
            return ActionResult.Invalid("Config nicht gefunden.");

        Server.ExecuteCommand(command);
        state.MarkLoaded(name);
        return ActionResult.Ok($"Config {name} geladen.");
    }

    public static ActionResult Match(MenuAction action, string label)
    {
        var command = MatchCommands.For(action);
        if (command == null) return ActionResult.Invalid("Unbekannte Match-Aktion.");

        Server.ExecuteCommand(command);
        return ActionResult.Ok($"{label}.");
    }
}
```

- [ ] **Step 2: AdminGate schreiben**

`plugin/AdminPlus/AdminGate.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Utils;
using Microsoft.Extensions.Logging;

namespace AdminPlus;

public partial class AdminPlus
{
    internal bool Can(CCSPlayerController admin, MenuAction action) =>
        Permissions.Can(flag => AdminManager.PlayerHasPermissions(admin, flag), action);

    /// <summary>
    /// Single choke point for every menu action: re-checks the permission, runs the action,
    /// writes the audit line and tells the admin the outcome.
    /// </summary>
    internal void Execute(CCSPlayerController admin, MenuAction action, string target, string detail, Func<ActionResult> run)
    {
        ActionResult outcome;
        try
        {
            outcome = Can(admin, action)
                ? run()
                : ActionResult.Denied("Dir fehlt das Recht dafür.");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "AdminPlus action {Action} failed", action);
            outcome = new ActionResult(Audit.Results.Error, "Aktion fehlgeschlagen, siehe Serverlog.");
        }

        Logger.LogInformation("{Line}",
            Audit.Format(admin.SteamID, admin.PlayerName, action.ToString(), target, detail, outcome.Result));

        admin.PrintToChat($" {ChatColors.Green}[Admin]{ChatColors.Default} {outcome.Message}");
    }

    /// <summary>Kick and ban must not hit the admin themself or someone with higher immunity.</summary>
    internal ActionResult CheckTarget(CCSPlayerController admin, int targetUserId)
    {
        var target = AdminActions.Find(targetUserId);
        if (target == null) return ActionResult.TargetGone();

        bool allowed = Targeting.IsAllowed(
            admin.UserId ?? -1, targetUserId, AdminManager.CanPlayerTarget(admin, target));

        return allowed
            ? ActionResult.Ok("")
            : ActionResult.Denied("Dieser Spieler darf von dir nicht gekickt oder gebannt werden.");
    }
}
```

- [ ] **Step 3: Bauen**

Run: `dotnet build plugin/AdminPlus -c Release`
Expected: Build ohne Fehler und Warnungen.

- [ ] **Step 4: Commit**

```powershell
git add plugin/AdminPlus/AdminActions.cs plugin/AdminPlus/AdminGate.cs
git commit -m "feat: add menu actions and audited execution gate" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Menüs und `!admin`

**Files:**
- Create: `plugin/AdminPlus/AdminMenu.cs`
- Create: `plugin/AdminPlus/Menus/PlayerMenu.cs`
- Create: `plugin/AdminPlus/Menus/MapMenu.cs`
- Create: `plugin/AdminPlus/Menus/SettingsMenu.cs`
- Create: `plugin/AdminPlus/Menus/MatchMenu.cs`
- Modify: `plugin/AdminPlus/AdminPlus.cs` (eine Zeile in `Load`)

**Interfaces:**
- Consumes: `AdminActions`, `Can`, `Execute`, `CheckTarget` aus Task 8; `Config`, `_configState`, `ConfigFolderPath` aus Task 7.
- Produces: `internal void OpenMain/OpenPlayers/OpenMaps/OpenSettings/OpenMatch(CCSPlayerController)`, `IMenu NewMenu(string)` (Chat- oder Center-Menü nach `Config.MenuType`), die Chat-Befehle `!admin` und `/admin` (registriert als `css_admin`).

- [ ] **Step 1: Hauptmenü schreiben**

`plugin/AdminPlus/AdminMenu.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Menu;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

public partial class AdminPlus
{
    private IMenu NewMenu(string title) =>
        Config.MenuType == "center" ? new CenterHtmlMenu(title, this) : new ChatMenu(title);

    private void OnAdminCommand(CCSPlayerController? player, CommandInfo info)
    {
        if (player == null)
        {
            info.ReplyToCommand("[AdminPlus] !admin geht nur im Spiel.");
            return;
        }

        if (!Permissions.CanOpenMenu(flag => AdminManager.PlayerHasPermissions(player, flag)))
        {
            player.PrintToChat($" {ChatColors.Red}[Admin]{ChatColors.Default} Kein Zugriff.");
            return;
        }

        OpenMain(player);
    }

    internal void OpenMain(CCSPlayerController admin)
    {
        var menu = NewMenu("HSTX Admin");

        if (Can(admin, MenuAction.Kick) || Can(admin, MenuAction.Ban))
            menu.AddMenuOption("Spieler", (p, _) => OpenPlayers(p));
        if (Can(admin, MenuAction.ChangeMap) || Can(admin, MenuAction.ChangeMode))
            menu.AddMenuOption("Map und Modus", (p, _) => OpenMaps(p));
        if (Can(admin, MenuAction.ChangeCvar) || Can(admin, MenuAction.LoadConfig))
            menu.AddMenuOption("Einstellungen", (p, _) => OpenSettings(p));
        if (Can(admin, MenuAction.MatchPause) || Can(admin, MenuAction.MatchRestart))
            menu.AddMenuOption("Match", (p, _) => OpenMatch(p));

        menu.Open(admin);
    }
}
```

- [ ] **Step 2: Spielermenü schreiben**

`plugin/AdminPlus/Menus/PlayerMenu.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Utils;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenPlayers(CCSPlayerController admin)
    {
        var menu = NewMenu("Spieler wählen");

        foreach (var target in AdminActions.HumanPlayers())
        {
            int userId = target.UserId!.Value;
            string name = target.PlayerName;
            menu.AddMenuOption(name, (p, _) => OpenPlayerActions(p, userId, name));
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        menu.Open(admin);
    }

    private void OpenPlayerActions(CCSPlayerController admin, int userId, string name)
    {
        var menu = NewMenu(name);

        void Add(string label, MenuAction action, string detail, Func<ActionResult> run, Action<CCSPlayerController> next)
        {
            if (!Can(admin, action)) return;
            menu.AddMenuOption(label, (p, _) =>
            {
                Execute(p, action, name, detail, run);
                next(p);
            });
        }

        void Stay(CCSPlayerController p) => OpenPlayerActions(p, userId, name);

        ActionResult Guarded(CCSPlayerController p, Func<ActionResult> run)
        {
            var check = CheckTarget(p, userId);
            return check.Result == Audit.Results.Ok ? run() : check;
        }

        Add("Kicken", MenuAction.Kick, "", () => Guarded(admin, () => AdminActions.Kick(userId)), OpenPlayers);
        if (Can(admin, MenuAction.Ban))
            menu.AddMenuOption("Bannen ...", (p, _) => OpenBanDurations(p, userId, name));
        Add("Muten / Entmuten", MenuAction.Mute, "", () => AdminActions.ToggleMute(userId), Stay);
        Add("Team: CT", MenuAction.SwitchTeam, "ct", () => AdminActions.SwitchTeam(userId, CsTeam.CounterTerrorist, "CT"), Stay);
        Add("Team: T", MenuAction.SwitchTeam, "t", () => AdminActions.SwitchTeam(userId, CsTeam.Terrorist, "T"), Stay);
        Add("Team: Zuschauer", MenuAction.SwitchTeam, "spec", () => AdminActions.SwitchTeam(userId, CsTeam.Spectator, "Zuschauer"), Stay);
        Add("Töten", MenuAction.Slay, "", () => AdminActions.Slay(userId), Stay);
        Add("Respawn", MenuAction.Respawn, "", () => AdminActions.Respawn(userId), Stay);

        menu.AddMenuOption("Zurück", (p, _) => OpenPlayers(p));
        menu.Open(admin);
    }

    private void OpenBanDurations(CCSPlayerController admin, int userId, string name)
    {
        var menu = NewMenu($"Bann: {name}");

        foreach (var (label, minutes) in new[] { ("1 Stunde", 60), ("1 Tag", 1440), ("7 Tage", 10080), ("Permanent", 0) })
        {
            menu.AddMenuOption(label, (p, _) =>
            {
                Execute(p, MenuAction.Ban, name, $"{minutes} min", () =>
                {
                    var check = CheckTarget(p, userId);
                    return check.Result == Audit.Results.Ok ? AdminActions.Ban(userId, minutes) : check;
                });
                OpenPlayers(p);
            });
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenPlayerActions(p, userId, name));
        menu.Open(admin);
    }
}
```

- [ ] **Step 3: Map- und Modusmenü schreiben**

`plugin/AdminPlus/Menus/MapMenu.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenMaps(CCSPlayerController admin)
    {
        var menu = NewMenu("Map und Modus");

        if (Can(admin, MenuAction.ChangeMap))
        {
            foreach (var map in Config.Maps)
            {
                var entry = map;
                menu.AddMenuOption(entry.Label, (p, _) =>
                    Execute(p, MenuAction.ChangeMap, string.IsNullOrEmpty(entry.WorkshopId) ? entry.Name : entry.WorkshopId, "",
                        () => AdminActions.ChangeMap(entry)));
            }
        }

        if (Can(admin, MenuAction.ChangeMode))
        {
            foreach (var mode in Config.Modes)
            {
                var entry = mode;
                menu.AddMenuOption($"Modus: {entry.Label}", (p, _) =>
                    Execute(p, MenuAction.ChangeMode, entry.Name, "", () => AdminActions.ChangeMode(entry)));
            }
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        menu.Open(admin);
    }
}
```

- [ ] **Step 4: Einstellungsmenü schreiben**

`plugin/AdminPlus/Menus/SettingsMenu.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenSettings(CCSPlayerController admin)
    {
        var menu = NewMenu("Einstellungen");
        menu.AddMenuOption(_configState.Label(), (_, _) => { }, true);

        if (Can(admin, MenuAction.ChangeCvar))
        {
            foreach (var category in Config.Cvars.Select(c => c.Category).Distinct())
            {
                var name = category;
                menu.AddMenuOption(name, (p, _) => OpenCategory(p, name));
            }
        }

        if (Can(admin, MenuAction.LoadConfig))
            menu.AddMenuOption("Config laden ...", (p, _) => OpenConfigs(p));

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        menu.Open(admin);
    }

    private void OpenCategory(CCSPlayerController admin, string category)
    {
        var menu = NewMenu(category);

        foreach (var cvar in Config.Cvars.Where(c => c.Category == category))
        {
            var def = cvar;
            menu.AddMenuOption(def.Label, (p, _) => OpenCvarValues(p, def));
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenSettings(p));
        menu.Open(admin);
    }

    private void OpenCvarValues(CCSPlayerController admin, CvarDefinition def)
    {
        var menu = NewMenu(def.Label);

        foreach (var value in CvarWhitelist.OptionsFor(def))
        {
            var chosen = value;
            menu.AddMenuOption(chosen, (p, _) =>
            {
                Execute(p, MenuAction.ChangeCvar, def.Name, chosen,
                    () => AdminActions.SetCvar(Config.Cvars, def.Name, chosen, _configState));
                OpenCvarValues(p, def);
            });
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenCategory(p, def.Category));
        menu.Open(admin);
    }

    private void OpenConfigs(CCSPlayerController admin)
    {
        var menu = NewMenu("Config laden");

        foreach (var name in ConfigCatalog.List(ConfigFolderPath))
        {
            var config = name;
            menu.AddMenuOption(config, (p, _) =>
            {
                Execute(p, MenuAction.LoadConfig, config, "",
                    () => AdminActions.LoadConfig(ConfigFolderPath, Config.ConfigDirectory, config, _configState));
                OpenSettings(p);
            });
        }

        menu.AddMenuOption("Zurück", (p, _) => OpenSettings(p));
        menu.Open(admin);
    }
}
```

- [ ] **Step 5: Matchmenü schreiben**

`plugin/AdminPlus/Menus/MatchMenu.cs`:

```csharp
using AdminPlus.Logic;
using CounterStrikeSharp.API.Core;

namespace AdminPlus;

public partial class AdminPlus
{
    internal void OpenMatch(CCSPlayerController admin)
    {
        var menu = NewMenu("Match");

        void Add(string label, MenuAction action)
        {
            if (!Can(admin, action)) return;
            menu.AddMenuOption(label, (p, _) =>
            {
                Execute(p, action, "", "", () => AdminActions.Match(action, label));
                OpenMatch(p);
            });
        }

        Add("Pause", MenuAction.MatchPause);
        Add("Fortsetzen", MenuAction.MatchResume);
        Add("Warmup beenden", MenuAction.WarmupEnd);
        Add("Teams tauschen", MenuAction.SwapTeams);

        if (Can(admin, MenuAction.MatchRestart))
            menu.AddMenuOption("Neustart ...", (p, _) => OpenRestartConfirm(p));

        menu.AddMenuOption("Zurück", (p, _) => OpenMain(p));
        menu.Open(admin);
    }

    private void OpenRestartConfirm(CCSPlayerController admin)
    {
        var menu = NewMenu("Match wirklich neu starten?");

        menu.AddMenuOption("Ja, neu starten", (p, _) =>
        {
            Execute(p, MenuAction.MatchRestart, "", "", () => AdminActions.Match(MenuAction.MatchRestart, "Match neu gestartet"));
            OpenMatch(p);
        });
        menu.AddMenuOption("Abbrechen", (p, _) => OpenMatch(p));
        menu.Open(admin);
    }
}
```

- [ ] **Step 6: `!admin` registrieren**

In `plugin/AdminPlus/AdminPlus.cs`, Methode `Load`, vor `RegisterListener` diese Zeile einfügen:

```csharp
        AddCommand("css_admin", "Open the HSTX admin menu", OnAdminCommand);
```

- [ ] **Step 7: Bauen und alle Tests laufen lassen**

Run: `dotnet build plugin/AdminPlus -c Release` und `dotnet test plugin/AdminPlus.Tests`
Expected: Build ohne Fehler und Warnungen, `Bestanden! Fehler: 0`.

- [ ] **Step 8: Commit**

```powershell
git add plugin/AdminPlus
git commit -m "feat: add !admin menu with player, map, settings and match submenus" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Beispiel-Configs und Dokumentation

**Files:**
- Create: `plugin/AdminPlus/examples/cfg-hstx/example-mr12.cfg`
- Create: `plugin/AdminPlus/examples/cfg-hstx/example-warmup.cfg`
- Modify: `plugin/README.md`
- Modify: `docs/superpowers/specs/2026-10-26-ingame-admin-menu-design.md`

**Interfaces:**
- Consumes: Verhalten aus Tasks 5 bis 9.
- Produces: Beispiel-Configs für Tests. Sie sind **keine** offiziellen Turnier-Configs, die Namen sagen das.

- [ ] **Step 1: Beispiel-Configs anlegen**

`plugin/AdminPlus/examples/cfg-hstx/example-mr12.cfg`:

```cfg
// Beispiel fuer Tests des AdminPlus-Menues. KEINE offizielle Turnier-Config.
echo "[example-mr12] loaded"
mp_maxrounds 24
mp_roundtime 1.92
mp_roundtime_defuse 1.92
mp_freezetime 15
mp_startmoney 800
mp_buytime 20
mp_overtime_enable 1
mp_friendlyfire 1
mp_autoteambalance 0
mp_limitteams 0
mp_warmuptime 60
```

`plugin/AdminPlus/examples/cfg-hstx/example-warmup.cfg`:

```cfg
// Beispiel fuer Tests des AdminPlus-Menues. KEINE offizielle Turnier-Config.
echo "[example-warmup] loaded"
mp_friendlyfire 0
mp_startmoney 16000
mp_buytime 90
mp_warmuptime 300
mp_warmup_pausetimer 1
bot_quota 0
```

- [ ] **Step 2: Plugin-README ergänzen**

In `plugin/README.md` vor der Überschrift `## Requirements` einfügen:

````markdown
## Ingame admin menu

Players with admin flags open the menu with `!admin` (or `/admin`). Entries without permission are hidden, and every action re-checks the permission when it runs. Menu texts are German.

| Area | Actions | Flag |
|---|---|---|
| Spieler | kick, mute, team, slay, respawn | `@css/kick` |
| Spieler | ban (1 hour, 1 day, 7 days, permanent) | `@css/ban` |
| Map und Modus | change map, change mode | `@css/changemap` |
| Einstellungen | change a whitelisted cvar | `@css/cvar` |
| Einstellungen | load a config from `cfg/hstx/` | `@css/root` |
| Match | pause, resume, end warmup, swap teams | `@css/changemap` |
| Match | restart | `@css/root` |

`@css/root` may do everything. Grant flags in CounterStrikeSharp's `configs/admins.json` and `admin_groups.json`.

Every menu action writes one line to the server log:

```
AUDIT admin=<SteamID64> name="<name>" action=<Action> target="<target>" detail="<value>" result=<ok|denied|target_gone|invalid|error>
```

### Configuration

On first load CounterStrikeSharp creates `configs/plugins/AdminPlus/AdminPlus.json` with the defaults:

- `ConfigDirectory`: folder below `game/csgo/cfg/` whose `*.cfg` files the menu may load (default `hstx`).
- `MenuType`: `chat` or `center`.
- `Cvars`: whitelist of changeable cvars (name, label, category, kind `Bool`/`Int`/`Float`/`Choice`, allowed values). Entries with unsafe names or values, and `sv_cheats`, `rcon_password` and `sv_password`, are dropped at load with a warning in the log.
- `Maps`: map name and optional workshop id.
- `Modes`: `GameType` and `GameMode` numbers.

Example configs for testing live in `plugin/AdminPlus/examples/cfg-hstx/`. They are not official tournament configs. Copy them to `game/csgo/cfg/hstx/` yourself.

### Panel commands

The `sm_*` commands used by the web panel are unchanged.

## Tests

```bash
dotnet test plugin/AdminPlus.Tests
```

The tests cover the pure logic in `plugin/AdminPlus/Logic/`. The menu itself needs a running CS2 server with Metamod and CounterStrikeSharp.

````

- [ ] **Step 3: Spec an die tatsächliche Struktur anpassen**

In `docs/superpowers/specs/2026-10-26-ingame-admin-menu-design.md`, Abschnitt 4, diese zwei Tabellenzeilen ersetzen:

```
| `PanelCommands.cs` | die bisherigen `sm_*`-Befehle, nur noch dünne Hüllen um `AdminActions` |
| `AdminActions.cs` | die eigentliche Logik jeder Aktion; wird vom Panel und vom Menü genutzt |
```

durch:

```
| `PanelCommands.cs` | die bisherigen `sm_*`-Befehle, zeichengleich aus `AdminPlus.cs` verschoben |
| `AdminActions.cs` | die Aktionen des Menüs; die Panel-Befehle bleiben bewusst getrennt, damit ihr Verhalten garantiert gleich bleibt |
| `AdminGate.cs` | zentrale Stelle jeder Menüaktion: Recht prüfen, ausführen, auditieren |
| `Config/AdminPlusConfig.cs` | Plugin-Konfiguration mit Normalisierung |
```

und in der Tabelle `Logic/` die Zeile `Logic/Audit.cs` durch `Logic/Audit.cs`, `Logic/ActionResult.cs`, `Logic/ConfigState.cs`, `Logic/GameCommands.cs`, `Logic/Catalog.cs` ergänzen, indem hinter der Zeile `| \`Logic/Audit.cs\` | Format der Logzeile |` diese Zeile eingefügt wird:

```
| `Logic/ActionResult.cs`, `Logic/ConfigState.cs`, `Logic/GameCommands.cs`, `Logic/Catalog.cs` | Ergebnis einer Aktion, zuletzt geladene Config, Befehlsbau für Kick/Ban/Map/Modus/Match, Standard-Maps und -Modi |
```

- [ ] **Step 4: Prüfen**

Run: `dotnet build plugin/AdminPlus -c Release` und `dotnet test plugin/AdminPlus.Tests`
Expected: unverändert grün (nur Doku und Beispiel-Dateien geändert).

- [ ] **Step 5: Commit**

```powershell
git add plugin/AdminPlus/examples plugin/README.md docs/superpowers/specs
git commit -m "docs: document ingame menu, config and examples" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verifikation am Test-Server (braucht ausdrückliche Freigaben)

**Dieser Task ändert den Test-Server (`:27106`, Pterodactyl-Volume `db786e75-16e1-45f9-9bf8-21d27424b328` auf hstx-core). Vor jedem Block mit Serveränderung die Freigabe des Nutzers einholen und das Ziel nennen.** Public, GunGame und War bleiben unberührt. Ohne Freigabe: Task überspringen und im Bericht als „nicht verifiziert" führen.

**Files:** keine im Repo, außer gezielten Korrekturen aus der Entscheidungstabelle (Step 8).

**Interfaces:**
- Consumes: gebautes `AdminPlus.dll` aus Task 9, Beispiel-Configs aus Task 10.
- Produces: ausgefüllte Ergebnistabelle (Step 7) und gegebenenfalls Korrektur-Commits.

- [ ] **Step 1: Release-DLL lokal bauen**

Run: `dotnet build plugin/AdminPlus -c Release`
Expected: `plugin/AdminPlus/bin/Release/net8.0/AdminPlus.dll` existiert. `build-plugin.sh` auf dem Server baut nur den Upstream-Commit und ist hier nicht nutzbar.

- [ ] **Step 2: Freigabe holen: DLL auf den Test-Server bringen**

Den Nutzer fragen: „Darf ich auf dem Test-Server (Volume db786e75…) die bisherige AdminPlus.dll sichern und durch den neuen Build ersetzen, `cfg/hstx/` anlegen und die zwei Beispiel-Configs hineinkopieren?" Erst nach Ja weiter.

```powershell
$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
$scp = "C:\Windows\System32\OpenSSH\scp.exe"
& $scp -o BatchMode=yes plugin/AdminPlus/bin/Release/net8.0/AdminPlus.dll hstx-core-admin:/tmp/AdminPlus.dev.dll
& $scp -o BatchMode=yes plugin/AdminPlus/examples/cfg-hstx/example-mr12.cfg plugin/AdminPlus/examples/cfg-hstx/example-warmup.cfg hstx-core-admin:/tmp/
```

Dann auf dem Server über einen Wegwerf-Container mit einem schon vorhandenen Image (kein Pull). Die Dateien im Volume gehören `994:983`:

```powershell
& $ssh -o BatchMode=yes hstx-core-admin @'
set -eu
V=/var/lib/pterodactyl/volumes/db786e75-16e1-45f9-9bf8-21d27424b328
P=game/csgo/addons/counterstrikesharp/plugins/AdminPlus
docker run --rm --entrypoint sh -v "$V":/data -v /tmp:/in:ro alpine/socat:1.8.0.3 -c "
  set -eu
  cp /data/$P/AdminPlus.dll /data/$P/AdminPlus.dll.bak-20261026
  sha256sum /data/$P/AdminPlus.dll.bak-20261026
  cp /in/AdminPlus.dev.dll /data/$P/AdminPlus.dll
  mkdir -p /data/game/csgo/cfg/hstx
  cp /in/example-mr12.cfg /in/example-warmup.cfg /data/game/csgo/cfg/hstx/
  chown 994:983 /data/$P/AdminPlus.dll /data/$P/AdminPlus.dll.bak-20261026 /data/game/csgo/cfg/hstx /data/game/csgo/cfg/hstx/*.cfg
  sha256sum /data/$P/AdminPlus.dll
"
'@
```

Expected: erste Prüfsumme der Sicherung beginnt mit `13fe21bc` (die bisher laufende DLL laut Installationsdoku), die zweite ist die des neuen Builds. Beide notieren.

- [ ] **Step 3: Nutzer lädt das Plugin im Pterodactyl-Panel neu**

Der Nutzer führt in der Konsole des Test-Servers (Pterodactyl, eigene Anmeldung, kein Secret für Claude) aus:

```
css_plugins unload AdminPlus
css_plugins load AdminPlus
css_plugins list
```

Expected: `AdminPlus (1.1.0) by dede177`. Danach lesend prüfen:

```powershell
& $ssh -o BatchMode=yes hstx-core-admin 'docker logs --tail 150 db786e75-16e1-45f9-9bf8-21d27424b328 2>&1 | grep -i adminplus'
```

Expected: `Loaded`, keine Ausnahme, und `Cvar '…' existiert auf diesem Server nicht` für jeden falsch geratenen Cvar-Namen (Prüfpunkt 4).

- [ ] **Step 4: Prüfpunkt 1 und 2 (Rechte der Panel-Befehle)**

Der Nutzer verbindet sich mit einem Konto, das **nicht** in `admins.json` steht, und gibt in die Spielkonsole `sm_respawn 1` ein. Ergebnis notieren: wirkt der Befehl (Spieler respawnt) oder nicht? Danach öffnet er das Panel `https://cs2-test.hardstylistixx.de` und bestätigt, dass die Spielerliste mit HP und Geld erscheint (das heißt, RCON-Aufrufe erreichen das Plugin).

- [ ] **Step 5: Freigabe holen: Admin-Konten eintragen**

Den Nutzer nach seiner SteamID64 fragen und um Freigabe bitten, `addons/counterstrikesharp/configs/admins.json` auf dem Test-Server zu ändern. Zuerst die bestehende Datei lesen und als `.bak-20261026` sichern, dann einen Eintrag ergänzen (Format von CounterStrikeSharp):

```json
{
  "Test-Moderator": { "identity": "<SteamID64>", "flags": ["@css/kick", "@css/generic"] }
}
```

Der Nutzer führt `css_admins_reload` aus und prüft als Moderator: `!admin` zeigt nur „Spieler", im Spielermenü kein „Bannen". Dann derselbe Eintrag mit `"flags": ["@css/root"]` für den Voll-Admin-Durchlauf, jeweils nach `css_admins_reload`. Am Ende den Test-Eintrag wieder entfernen oder die Sicherung zurückspielen.

- [ ] **Step 6: Funktionsdurchlauf als Voll-Admin**

Der Nutzer geht jeden Punkt durch, Claude liest danach die Auditzeilen mit `docker logs … | grep AUDIT` und trägt die Ergebnisse ein:

1. Map wechseln, Modus wechseln.
2. Cvar aus jeder Kategorie ändern, Wert im Spiel prüfen.
3. Config `example-mr12` laden: Menükopf zeigt „Config: example-mr12"; danach eine Cvar ändern: „(manuell geändert)".
4. Pause, Fortsetzen, Warmup beenden, Teams tauschen, Neustart (mit Bestätigung).
5. Mit zweitem Spieler: Team wechseln, Töten, Respawn, Muten, Kicken, Bannen. **Ohne zweiten Spieler** bleiben Mute, Kick und Ban unverifiziert (Step 8).
6. Selbst kicken versuchen: wird abgelehnt (`result=denied`).
7. Spieler verlässt den Server, während das Aktionsmenü offen ist, dann Aktion wählen: „Spieler nicht mehr auf dem Server", Audit `result=target_gone`.
8. Beide Menütypen: in `configs/plugins/AdminPlus/AdminPlus.json` `MenuType` auf `center` stellen, Plugin neu laden, Bedienung und Tastenbelegung notieren, danach den besseren Typ als Standard festlegen.
9. Absichtlich syntaktisch kaputtes JSON in `AdminPlus.json` (fehlende Klammer): Verhalten notieren (lädt das Plugin trotzdem? Meldung im Log?). Danach Datei wiederherstellen.
10. (aus dem Review) Zweiter Spieler nennt sich `Max<br>Kicken` bzw. `a"b`: Spielerliste in beiden Menütypen bleibt korrekt nummeriert, Auditzeile bleibt eine Zeile.
11. (aus dem Review) Kick auf einen Spieler, der gerade erst verbindet: Meldung notieren (erwartet „darf nicht" oder „nicht mehr auf dem Server"; beides ist kein Fehler, aber die Formulierung soll passen).
12. (aus dem Review) Plugin mitten in der Map per `css_plugins load` laden: Erscheinen die Warnungen zu unbekannten Cvar-Namen sofort oder erst beim nächsten Mapwechsel? Ergebnis in Abschnitt 11 der Spec eintragen.
13. (aus dem Review) Moduswechsel auf einer Workshop-Map: Schlägt `changelevel` fehl, bleiben `game_type`/`game_mode` bereits umgestellt. Verhalten notieren.

- [ ] **Step 7: Ergebnistabelle ausfüllen**

In `docs/superpowers/specs/2026-10-26-ingame-admin-menu-design.md` Abschnitt 11 jede der sieben Fragen mit Ergebnis beantworten (Spielerzugriff auf `sm_*`, RCON-Aufrufer, Menütyp und Tasten, Cvar-Namen, Ban, Mute, Moduswechsel). Ergebnis als Text, nicht als Vermutung.

- [ ] **Step 8: Entscheidungen aus den Ergebnissen**

| Ergebnis | Änderung |
|---|---|
| `kickid`/`banid`/`writeid` wirken anders | nur `ModerationCommands` in `Logic/GameCommands.cs` und `CommandsTests.cs` anpassen |
| Ban bleibt nach Neustart nicht bestehen oder Ban nicht prüfbar | Ban-Eintrag aus `PlayerMenu.cs` entfernen und im Spec Abschnitt 2 als „später" führen |
| Mute wirkt nicht | `Mute`-Eintrag aus `PlayerMenu.cs` entfernen, im Spec vermerken |
| Cvar-Namen existieren nicht | betroffene Einträge in `DefaultCvars.cs` korrigieren oder streichen |
| Moduswechsel braucht andere Befehle | `TryBuildMode` in `Logic/GameCommands.cs` und Test anpassen |
| `center` ist besser bedienbar | Standard von `MenuType` in `Config/AdminPlusConfig.cs` auf `"center"`, `Default_config_round_trips_and_is_clean` anpassen |
| Kaputtes JSON lässt das Plugin gar nicht laden | in `plugin/README.md` dokumentieren, dass `AdminPlus.json` gültiges JSON sein muss |

Jede Korrektur: Test zuerst anpassen, fehlschlagen sehen, Code ändern, `dotnet test plugin/AdminPlus.Tests`, einzeln committen.

- [ ] **Step 9: Commit der Ergebnisse**

```powershell
git add docs/superpowers/specs plugin
git commit -m "docs: record test server verification results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Panel-Befehle absichern (erst nach Task 11)

**Voraussetzung:** Task 11 hat bestätigt, dass (a) RCON-Aufrufe als Server-Konsole ankommen (`caller == null`, das Panel zeigt Spielerdaten) und (b) die Absicherung nötig ist (normale Spieler konnten `sm_*` auslösen). War (a) nicht erfüllt, diesen Task **nicht** ausführen: das Panel würde sonst ausgesperrt. War nur (b) nicht erfüllt, ist die Absicherung trotzdem sinnvoll, aber nicht dringend.

**Files:**
- Modify: `plugin/AdminPlus/AdminGate.cs`
- Modify: `plugin/AdminPlus/PanelCommands.cs`

**Interfaces:**
- Consumes: `Permissions.AllowsPanelCommand` (Task 1, bereits getestet).
- Produces: `private bool PanelAllowed(CCSPlayerController? caller, CommandInfo info)`. Alle 13 Panel-Befehle rufen es als erste Zeile auf.

- [ ] **Step 1: PanelAllowed ergänzen**

In `plugin/AdminPlus/AdminGate.cs` am Dateianfang `using CounterStrikeSharp.API.Modules.Commands;` ergänzen und vor der letzten schließenden Klammer der Klasse einfügen:

```csharp
    /// <summary>The panel talks to these commands over RCON (caller is null). Players need root.</summary>
    private bool PanelAllowed(CCSPlayerController? caller, CommandInfo info)
    {
        bool allowed = Permissions.AllowsPanelCommand(
            caller == null, flag => AdminManager.PlayerHasPermissions(caller!, flag));

        if (!allowed)
            info.ReplyToCommand("[AdminPlus] Dieser Befehl ist nur über die Server-Konsole oder RCON erlaubt.");

        return allowed;
    }
```

- [ ] **Step 2: Absicherung in alle 13 Befehle einfügen**

```powershell
$p = "plugin/AdminPlus/PanelCommands.cs"
$text = Get-Content $p -Raw
$pattern = '(?m)^(    public void On\w+\(CCSPlayerController\? caller, CommandInfo info\)\r?\n    \{\r?\n)'
$count = [regex]::Matches($text, $pattern).Count
if ($count -ne 13) { throw "Erwartet 13 Befehlsmethoden, gefunden $count" }
$new = [regex]::Replace($text, $pattern, '${1}        if (!PanelAllowed(caller, info)) return;' + "`n")
Set-Content $p $new -NoNewline -Encoding utf8
@($new -split "`n" | Select-String 'PanelAllowed\(caller, info\)').Count
```

Expected: `13`.

- [ ] **Step 3: Bauen und testen**

Run: `dotnet build plugin/AdminPlus -c Release` und `dotnet test plugin/AdminPlus.Tests`
Expected: Build ohne Fehler und Warnungen, `Bestanden! Fehler: 0`.

- [ ] **Step 4: Commit**

```powershell
git add plugin/AdminPlus
git commit -m "fix: restrict sm_ panel commands to console/RCON or root" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Am Test-Server erneut prüfen (Freigabe holen)**

Mit Freigabe des Nutzers die neue DLL wie in Task 11 Step 2 einspielen (Sicherung `AdminPlus.dll.bak-20261026` nicht überschreiben, neue Sicherung mit anderem Datum) und Plugin neu laden. Dann: (1) Panel `https://cs2-test.hardstylistixx.de` zeigt weiterhin Spielerliste mit HP und Geld und eine Aktion (Respawn) funktioniert; (2) ein Spieler ohne Admin-Recht gibt `sm_respawn 1` in die Konsole ein und bekommt die Ablehnung; (3) `docker logs … | grep -i "Plugin not responding"` in der Panel-Logik (`docker logs cs2-panel-test --tail 50`) zeigt nichts Neues. Schlägt (1) fehl: Sicherung zurückspielen, Task zurückstellen und Befund melden.

---

### Task 13: Auf GitHub festhalten

Der Nutzer hat gewünscht, dass Spezifikation und Plan auch in GitHub liegen. Das angemeldete Konto `WildcardBastard` hat in `dede177/cs2-admin-plus` nur Leserechte, deshalb läuft es über einen Fork und einen Draft-PR.

**Files:** keine.

- [ ] **Step 1: Fork anlegen und Remote eintragen**

```powershell
gh repo fork dede177/cs2-admin-plus --clone=false
git remote add fork https://github.com/WildcardBastard/cs2-admin-plus.git
git remote -v
```

Expected: `fork` zeigt auf `WildcardBastard/cs2-admin-plus`, `origin` bleibt `dede177/cs2-admin-plus`.

- [ ] **Step 2: Branch pushen**

```powershell
git push -u fork feat/ingame-admin-menu
```

Expected: Branch liegt im Fork. Es wird nicht nach `origin` gepusht.

- [ ] **Step 3: Draft-PR öffnen**

```powershell
gh pr create --repo dede177/cs2-admin-plus --draft --base main --head WildcardBastard:feat/ingame-admin-menu --title "Ingame admin menu for AdminPlus" --body-file "$env:TEMP\pr-body.md"
```

Der Text kommt aus `$env:TEMP\pr-body.md`: Ziel, Verweis auf Spec und Plan, Stand (welche Tasks erledigt, was am Test-Server verifiziert oder offen ist) und am Ende die Zeile `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Die Datei liegt außerhalb des Repos.

- [ ] **Step 4: Link melden**

Den PR-Link dem Nutzer nennen. Gemergt wird nicht ohne Auftrag.

---

## Selbstprüfung gegen die Spec

| Spec-Abschnitt | Abgedeckt durch |
|---|---|
| 1 Ziel, Erfolgskriterien | Tasks 1 bis 9, Verifikation Task 11 |
| 2 Nicht im Umfang (Rollout, Panel, Ready-Check, freie Eingabe) | bewusst keine Tasks; Task 11 Step 8 hält Ban/Mute-Rückfall fest |
| 3 Ausgangslage, ungeprüfte `sm_*`-Rechte | Task 11 Step 4, Task 12 |
| 4 Architektur | Tasks 1 bis 9; Abweichung (Panel-Befehle nicht über `AdminActions`) in Task 10 Step 3 in die Spec übernommen |
| 5 Rechte, zwei Prüfungen | Task 1 (Mapping), Task 8 (`Execute` prüft erneut), Task 9 (Ausblenden), Task 12 (Panel) |
| 6.1 Spieler, Selbst-/Immunitätsschutz | Task 1 (`Targeting`), Task 8 (`CheckTarget`), Task 9 |
| 6.2 Map und Modus | Task 5, Task 9 |
| 6.3 Cvars und Configs | Tasks 2, 3, 9; Anzeige zuletzt geladener Config Task 4 und 9 |
| 6.4 Match | Task 5, Task 9 (Neustart mit Bestätigung) |
| 7 Audit | Task 4 (Format), Task 8 (Schreiben) |
| 8 Konfiguration | Task 6, Task 10 (README) |
| 9 Fehlerverhalten | Task 8 (`try/catch`, Meldung), Task 6 (Normalisierung) |
| 10 Tests | Tasks 1 bis 6, Beispiel-Configs Task 10 |
| 11 Zu verifizieren | Task 11 |
| 12 Rollout | nur Test-Server (Task 11); Pin-Update und Produktivserver sind ausdrücklich nicht Teil des Plans |
| 13 Risiken | Cvar-Prüfung beim Start Task 7 (`CheckCvarNames`) |
