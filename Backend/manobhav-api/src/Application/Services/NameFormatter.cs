namespace Application.Services;

/// <summary>
/// Normalizes person/display names to title case: the first letter of every word is uppercased and
/// the rest are lowercased ("abcd xyz" -> "Abcd Xyz", "Abcd xyz" -> "Abcd Xyz", "ABCD" -> "Abcd").
/// Word boundaries are any non-alphanumeric character, which mirrors Postgres <c>initcap()</c> used by
/// the backfill migration. The transform is idempotent and never throws, so callers can apply it to any
/// user-entered name without risking a save failure. Already-correct input is returned unchanged.
/// </summary>
public static class NameFormatter
{
    public static string? ToTitleCase(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var characters = value.ToCharArray();
        var atWordStart = true;
        for (var index = 0; index < characters.Length; index++)
        {
            var character = characters[index];
            if (char.IsLetterOrDigit(character))
            {
                characters[index] = atWordStart ? char.ToUpperInvariant(character) : char.ToLowerInvariant(character);
                atWordStart = false;
            }
            else
            {
                atWordStart = true;
            }
        }

        return new string(characters);
    }
}
