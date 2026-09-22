package dev.worldcombat.cobblemon.mixin;

import dev.worldcombat.cobblemon.client.CompanionInput;
import net.minecraft.client.KeyboardHandler;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(KeyboardHandler.class)
public abstract class CombatKeyboardMixin {
    // NeoForge's keyboard notification is after vanilla and cannot cancel Esc/hotbar handling.
    @Inject(method = "keyPress", at = @At("HEAD"), cancellable = true)
    private void worldcombat$input(long window, int key, int scanCode, int action, int modifiers, CallbackInfo ci) {
        if (CompanionInput.key(window, key, scanCode, action)) ci.cancel();
    }
}
