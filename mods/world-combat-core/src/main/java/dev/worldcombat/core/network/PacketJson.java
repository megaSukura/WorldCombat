package dev.worldcombat.core.network;

import java.nio.charset.StandardCharsets;
import net.minecraft.network.FriendlyByteBuf;

/** UTF-8 JSON carried by the native byte-array codec. NeoForge's negotiated packet splitter handles large packets. */
public final class PacketJson {
    private PacketJson() {}
    public static String read(FriendlyByteBuf buffer) { return new String(buffer.readByteArray(), StandardCharsets.UTF_8); }
    public static void write(FriendlyByteBuf buffer, String json) { buffer.writeByteArray(json.getBytes(StandardCharsets.UTF_8)); }
}
