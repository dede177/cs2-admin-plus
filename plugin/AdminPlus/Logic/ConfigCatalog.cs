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
