package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.common.util.TriState;
import net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent;
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent;

/** Native item-use lifecycle; content may reject an attempt without moving or replacing the real stack. */
public final class NativeItemUse {
    private NativeItemUse() {}

    public static boolean allowed(LivingEntity entity, ItemStack stack, InteractionHand hand, String operation) {
        if (stack.isEmpty() || !(entity.level() instanceof ServerLevel level)
            || !CombatServices.CONTENT.hooks().has("world_combat:item_use")) return true;
        var combat = CombatServices.get(level.getServer());
        if (!CombatServices.domain(entity).available(entity)) return true;
        var data = new JsonObject();
        data.addProperty("operation", operation);
        data.addProperty("hand", hand == InteractionHand.MAIN_HAND ? "mainhand" : "offhand");
        data.addProperty("item", BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
        data.addProperty("count", stack.getCount());
        return combat.runtime().event("world_combat:item_use", combat.bind(entity), null, data.toString(), false).rejection().isEmpty();
    }

    public static void install(IEventBus bus) {
        bus.addListener((LivingEntityUseItemEvent.Start event) -> {
            if (!allowed(event.getEntity(), event.getItem(), event.getHand(), "start")) event.setCanceled(true);
        });
        bus.addListener((LivingEntityUseItemEvent.Tick event) -> {
            if (!allowed(event.getEntity(), event.getItem(), event.getHand(), "continue")) event.setCanceled(true);
        });
        bus.addListener((LivingEntityUseItemEvent.Stop event) -> {
            if (!allowed(event.getEntity(), event.getItem(), event.getHand(), "release")) event.setCanceled(true);
        });
        bus.addListener((PlayerInteractEvent.RightClickItem event) -> {
            if (!allowed(event.getEntity(), event.getItemStack(), event.getHand(), "use")) {
                event.setCanceled(true); event.setCancellationResult(InteractionResult.FAIL);
            }
        });
        bus.addListener((PlayerInteractEvent.RightClickBlock event) -> {
            if (!allowed(event.getEntity(), event.getItemStack(), event.getHand(), "block")) event.setUseItem(TriState.FALSE);
        });
        bus.addListener((PlayerInteractEvent.EntityInteract event) -> {
            if (!allowed(event.getEntity(), event.getItemStack(), event.getHand(), "entity")) {
                event.setCanceled(true); event.setCancellationResult(InteractionResult.FAIL);
            }
        });
        bus.addListener((PlayerInteractEvent.EntityInteractSpecific event) -> {
            if (!allowed(event.getEntity(), event.getItemStack(), event.getHand(), "entity")) {
                event.setCanceled(true); event.setCancellationResult(InteractionResult.FAIL);
            }
        });
    }
}
