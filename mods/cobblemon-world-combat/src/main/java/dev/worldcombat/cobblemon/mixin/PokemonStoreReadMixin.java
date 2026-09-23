package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.storage.PokemonStore;
import com.cobblemon.mod.common.api.storage.adapter.flatfile.FileStoreAdapter;
import com.cobblemon.mod.common.api.storage.factory.FileBackedPokemonStoreFactory;
import net.minecraft.core.RegistryAccess;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;

/** A cache miss must observe writes queued before the previous PC instance was evicted. */
@Mixin(value = FileBackedPokemonStoreFactory.class, remap = false)
public abstract class PokemonStoreReadMixin {
    @Shadow protected abstract ExecutorService getSaveExecutor();

    @Redirect(method = "getStore", at = @At(value = "INVOKE", target =
        "Lcom/cobblemon/mod/common/api/storage/adapter/flatfile/FileStoreAdapter;load(Ljava/lang/Class;Ljava/util/UUID;Lnet/minecraft/core/RegistryAccess;)Lcom/cobblemon/mod/common/api/storage/PokemonStore;"))
    @SuppressWarnings({"rawtypes", "unchecked"})
    private PokemonStore<?> worldcombat$readAfterWrites(FileStoreAdapter adapter, Class storeClass, UUID id, RegistryAccess access) {
        try {
            // Disk reads still execute on their original caller. Cached access takes the
            // native fast path and never reaches this fence; the native writer owns ordering.
            getSaveExecutor().submit(() -> {}).get();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for Pokemon store writes", error);
        } catch (ExecutionException error) {
            throw new IllegalStateException("Could not finish Pokemon store writes before reading", error.getCause());
        }
        return adapter.load(storeClass, id, access);
    }
}
