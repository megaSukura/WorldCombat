package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.WorldAccess;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.*;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Actual drop-to-slot transfer and the explicit distinction between removal and consumption. */
public final class NativeEquipmentPickupChecks {
    private static UUID subject;
    private static int consumed;
    public static void onConsumed(WorldEvent event) {
        if (subject == null || event.target() == null || !event.target().entity().equals(subject)) return;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(event.actor().equals(event.target()) && data.get("count").getAsInt() == 1
            && data.get("provider").getAsString().equals("minecraft") && data.get("slot").getAsString().equals("mainhand"),
            "Consumption lost actual consumer/holder/slot/count");
        require(data.get("item").getAsString().contains("checks:kept"), "Consumed receipt lost native stack components");
        consumed++;
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2); var actor = combat.bind(body);
        var stack = new ItemStack(Items.APPLE, 3); stack.set(DataComponents.CUSTOM_NAME, Component.literal("checks:kept"));
        var item = new ItemEntity(level, 3, 100.5, 2, stack.copy()); item.setNoGravity(true); item.setNoPickUpDelay();
        require(level.addFreshEntity(item), "Dropped stack fixture was refused"); subject = body.getUUID(); consumed = 0;
        try {
            var original = NativeRegistryFacts.serializeStack(level.registryAccess(), item.getItem());
            WorldEquipment.registerWriter("checks:pickup-refusal", new WorldEquipment.Writer() {
                @Override public WorldEquipment.Opened open(net.minecraft.world.entity.LivingEntity entity, String slot, int index, ItemStack expected) {
                    return WorldEquipment.Opened.success(new WorldEquipment.Slot() {
                        public ItemStack stock() { return ItemStack.EMPTY; }
                        public boolean fresh() { return true; }
                        public String preflight(ItemStack incoming, boolean droppable) { return "checks:refused"; }
                        public boolean commit(ItemStack incoming) { throw new AssertionError("Refused destination was written"); }
                        public void settle(ItemStack previous) {}
                    });
                }
            });
            var refused = NativeEquipment.collectOp(combat, actor, actor, "checks:pickup-refusal", "mainhand", 0, "", item.getStringUUID(), original, 1);
            require(!refused.ok() && item.getItem().getCount() == 3 && !item.isRemoved() && body.getMainHandItem().isEmpty(), "Refused pickup lost material");
            item.setPickUpDelay(20);
            require(!NativeEquipment.collectOp(combat, actor, actor, "minecraft", "mainhand", 0, "", item.getStringUUID(), original, 1).ok()
                && item.getItem().getCount() == 3, "Pickup bypassed native delay"); item.setNoPickUpDelay();
            item.setTarget(UUID.randomUUID());
            require(!NativeEquipment.collectOp(combat, actor, actor, "minecraft", "mainhand", 0, "", item.getStringUUID(), original, 1).ok(), "Pickup bypassed native ownership");
            item.setTarget(null);
            var result = NativeEquipment.collectOp(combat, actor, actor, "minecraft", "mainhand", 0, "", item.getStringUUID(), original, 1);
            require(result.ok() && result.count() == 1 && item.getItem().getCount() == 2 && !item.isRemoved()
                && ItemStack.matches(body.getMainHandItem(), stack.copyWithCount(1)), "Single-item pickup lost its remainder or components");
            require(!NativeEquipment.collectOp(combat, actor, actor, "minecraft", "mainhand", 0, "", item.getStringUUID(), original, 1).ok()
                && item.getItem().getCount() == 2, "Stale drop snapshot duplicated material");

            var world = new WorldAccess(combat.runtime(), actor, null, () -> {}, true, 0);
            var held = NativeRegistryFacts.serializeStack(level.registryAccess(), body.getMainHandItem());
            require(JsonParser.parseString(world.equipmentTakeResult(actor, "minecraft", "mainhand", 0, held, 1)).getAsJsonObject().get("ok").getAsBoolean()
                && consumed == 0, "Taking a stack was reported as consuming it");
            body.setItemSlot(EquipmentSlot.MAINHAND, stack.copyWithCount(1));
            require(JsonParser.parseString(world.equipmentConsumeResult(actor, "minecraft", "mainhand", 0, held, 1)).getAsJsonObject().get("ok").getAsBoolean()
                && consumed == 1 && body.getMainHandItem().isEmpty(), "Real consumption did not publish exactly one receipt");
            world.equipmentConsumeResult(actor, "minecraft", "mainhand", 0, held, 1);
            require(consumed == 1, "Stale consumption published another receipt");
            mark("Native equipment pickup verified: one item, exact components, refusal/delay/owner/stale preservation and explicit consumption");
        } finally { subject = null; body.discard(); item.discard(); }
    }
}
