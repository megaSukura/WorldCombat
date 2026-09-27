package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import dev.worldcombat.core.runtime.ActorHandle;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.item.ItemStack;

/** Native durability use on an exact observed slot. Other slot providers own their durability callbacks. */
public final class NativeEquipmentDamage {
    private NativeEquipmentDamage() {}
    public record Result(boolean ok, String reason, int damage, boolean broken) {
        public static Result refused(String reason) { return new Result(false, reason, 0, false); }
        public String json() {
            var data = new JsonObject(); data.addProperty("ok", ok); data.addProperty("reason", reason);
            data.addProperty("damage", damage); data.addProperty("broken", broken); return data.toString();
        }
    }
    public static Result apply(MinecraftCombat combat, ActorHandle target, String provider, String name, int index, String expected, int amount) {
        var entity = combat.resolve(target);
        if (entity == null) return Result.refused("entity-left");
        if (amount <= 0) return Result.refused("no-wear");
        var snapshot = NativeRegistryFacts.parseStack(entity.registryAccess(), expected);
        if (!provider.equals("minecraft")) return WorldEquipment.damage(provider, entity, name, index, snapshot, amount);
        EquipmentSlot slot;
        try { slot = EquipmentSlot.byName(name); } catch (IllegalArgumentException invalid) { return Result.refused("unknown-slot"); }
        if (index != 0) return Result.refused("unknown-slot");
        var actual = entity.getItemBySlot(slot);
        if (!ItemStack.matches(snapshot, actual)) return Result.refused("stale");
        if (!actual.isDamageableItem()) return Result.refused("not-damageable");
        int before = actual.getDamageValue(), maximum = actual.getMaxDamage(), count = actual.getCount();
        actual.hurtAndBreak(amount, entity, slot);
        boolean broken = actual.getCount() < count;
        int damage = broken ? maximum - before : Math.max(0, actual.getDamageValue() - before);
        return new Result(damage > 0 || broken, damage > 0 || broken ? "" : "no-wear", damage, broken);
    }
}
