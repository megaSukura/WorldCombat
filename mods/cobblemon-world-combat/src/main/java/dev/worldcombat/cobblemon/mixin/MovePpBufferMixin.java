package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.moves.Move;
import com.cobblemon.mod.common.net.IntSize;
import com.cobblemon.mod.common.util.NetExtensionsKt;
import io.netty.buffer.ByteBuf;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Widens the packet field that carries an individual's current PP from {@code U_BYTE} to {@code INT}. With a pack
 * capacity multiplier a legal balance can exceed 255, so the byte field would truncate it. Only the first sized int
 * (current PP) changes; raised PP stages stay on their native {@code U_BYTE}. The companion read is widened to match.
 */
@Mixin(Move.class)
public abstract class MovePpBufferMixin {
    @Redirect(
        method = "saveToBuffer",
        at = @At(
            value = "INVOKE",
            target = "Lcom/cobblemon/mod/common/util/NetExtensionsKt;writeSizedInt(Lio/netty/buffer/ByteBuf;Lcom/cobblemon/mod/common/net/IntSize;I)V",
            ordinal = 0
        )
    )
    private void worldcombat$writeWidePp(ByteBuf buffer, IntSize size, int value) {
        NetExtensionsKt.writeSizedInt(buffer, IntSize.INT, value);
    }
}
