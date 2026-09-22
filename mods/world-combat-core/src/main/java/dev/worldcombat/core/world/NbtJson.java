package dev.worldcombat.core.world;

import net.minecraft.nbt.*;

/** One logical JSON value stored across native NBT string fields when necessary. Reads legacy strings unchanged. */
public final class NbtJson {
    private NbtJson() {}
    public static Tag write(String json) {
        var chunks = new ListTag(); int start = 0, bytes = 0;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            int width = c > 0 && c < 128 ? 1 : c <= 2047 ? 2 : 3;
            // DataOutput.writeUTF uses a 16-bit byte count and modified UTF-8, including surrogate code units.
            if (bytes + width > 65535) { chunks.add(StringTag.valueOf(json.substring(start, i))); start = i; bytes = 0; }
            bytes += width;
        }
        if (start == 0) return StringTag.valueOf(json);
        chunks.add(StringTag.valueOf(json.substring(start))); return chunks;
    }
    public static String read(Tag tag) {
        if (tag instanceof StringTag string) return string.getAsString();
        if (!(tag instanceof ListTag chunks) || chunks.getElementType() != Tag.TAG_STRING)
            throw new IllegalArgumentException("Expected JSON string storage");
        var value = new StringBuilder(); chunks.forEach(chunk -> value.append(chunk.getAsString())); return value.toString();
    }
}
