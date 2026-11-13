using System.Text.Json;
using System.Text.Json.Serialization;

namespace AdminPlus.Logic;

/// <summary>
/// CounterStrikeSharp deserialises the plugin config outside any try/catch, so a single
/// bad entry would stop the whole plugin from loading. These converters keep per-entry
/// mistakes local: a broken entry becomes a marker that Normalize drops with a log line.
/// </summary>
public interface INamedEntry
{
    string Name { get; set; }
}

public static class TolerantJson
{
    public const string InvalidName = "<ungültiger Eintrag>";
}

public sealed class TolerantListConverter<T> : JsonConverter<List<T>> where T : class, INamedEntry, new()
{
    public override List<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var list = new List<T>();
        if (reader.TokenType != JsonTokenType.StartArray)
        {
            reader.Skip();
            return list;
        }

        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                list.Add(null!);
                continue;
            }

            var element = JsonElement.ParseValue(ref reader);
            T? item;
            try
            {
                item = element.Deserialize<T>(options);
            }
            catch (JsonException)
            {
                item = null;
            }

            list.Add(item ?? new T { Name = TolerantJson.InvalidName });
        }

        return list;
    }

    public override void Write(Utf8JsonWriter writer, List<T> value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var item in value) JsonSerializer.Serialize(writer, item, options);
        writer.WriteEndArray();
    }
}

public sealed class TolerantStringListConverter : JsonConverter<List<string>>
{
    public override List<string> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var list = new List<string>();
        if (reader.TokenType != JsonTokenType.StartArray)
        {
            reader.Skip();
            return list;
        }

        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.String:
                    list.Add(reader.GetString() ?? "");
                    break;
                case JsonTokenType.Number:
                    list.Add(JsonElement.ParseValue(ref reader).GetRawText());
                    break;
                default:
                    reader.Skip();
                    break;
            }
        }

        return list;
    }

    public override void Write(Utf8JsonWriter writer, List<string> value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var item in value) writer.WriteStringValue(item);
        writer.WriteEndArray();
    }
}

public sealed class TolerantStringConverter : JsonConverter<string>
{
    public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.String:
                return reader.GetString() ?? "";
            case JsonTokenType.Number:
            case JsonTokenType.True:
            case JsonTokenType.False:
                return JsonElement.ParseValue(ref reader).GetRawText();
            default:
                reader.Skip();
                return "";
        }
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}
