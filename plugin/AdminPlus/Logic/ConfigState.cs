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
