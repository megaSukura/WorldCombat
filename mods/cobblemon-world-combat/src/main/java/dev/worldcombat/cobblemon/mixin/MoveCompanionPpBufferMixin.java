package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.net.IntSize;
import com.cobblemon.mod.common.util.NetExtensionsKt;
import io.netty.buffer.ByteBuf;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Companion half of the widened PP packet field: reads the first sized int (current PP) as {@code INT} so it
 * matches {@code MovePpBufferMixin}. Raised PP stages keep their native {@code U_BYTE}.
 */
@Mixin(targets = "com.cobblemon.mod.common.api.moves.Move$Companion")
public abstract class MoveCompanionPpBufferMixin {
    @Redirect(
        method = "loadFromBuffer",
        at = @At(
            value = "INVOKE",
            target = "Lcom/cobblemon/mod/common/util/NetExtensionsKt;readSizedInt(Lio/netty/buffer/ByteBuf;Lcom/cobblemon/mod/common/net/IntSize;)I",
            ordinal = 0
        )
    )
    private int worldcombat$readWidePp(ByteBuf buffer, IntSize size) {
        return NetExtensionsKt.readSizedInt(buffer, IntSize.INT);
    }
}
