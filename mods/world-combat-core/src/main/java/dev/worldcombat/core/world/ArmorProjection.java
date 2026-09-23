package dev.worldcombat.core.world;

import com.google.gson.JsonObject;
import net.minecraft.world.damagesource.CombatRules;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;

/** Excludes an explicitly accounted base projection while retaining native attribute modifiers. */
public final class ArmorProjection {
    private ArmorProjection() {}

    static double excluded(JsonObject data, String name) {
        if (!data.has(name) || !data.get(name).isJsonPrimitive() || !data.getAsJsonPrimitive(name).isNumber()) return 0;
        double value = data.get(name).getAsDouble();
        return Double.isFinite(value) && value > 0 ? value : 0;
    }

    static double remaining(AttributeInstance original, double excluded) {
        return remaining(original, excluded, 0);
    }

    /** Subtract an accounted additive contribution before native multipliers, leaving live modifiers intact. */
    static double remaining(AttributeInstance original, double excluded, double addedExcluded) {
        if (original == null) return 0;
        if (excluded <= 0 && addedExcluded == 0) return original.getValue();
        var copy = new AttributeInstance(original.getAttribute(), ignored -> {});
        copy.replaceFrom(original);
        copy.setBaseValue(Math.max(0, original.getBaseValue() - excluded) - addedExcluded);
        return copy.getValue();
    }

    static double signed(JsonObject data, String name) {
        if (!data.has(name) || !data.get(name).isJsonPrimitive() || !data.getAsJsonPrimitive(name).isNumber()) return 0;
        double value = data.get(name).getAsDouble();
        return Double.isFinite(value) ? value : 0;
    }

    static float adjust(float reduction, float fullDamage, float remainingDamage) {
        double result = (double) reduction + fullDamage - remainingDamage;
        return Double.isFinite(result) && Math.abs(result) <= Float.MAX_VALUE ? (float) result : reduction;
    }

    public static void apply(LivingIncomingDamageEvent event, JsonObject data) {
        double armorExcluded = excluded(data, "armorExcluded"), toughnessExcluded = excluded(data, "toughnessExcluded");
        double armorAddedExcluded = signed(data, "armorAddedExcluded"), toughnessAddedExcluded = signed(data, "toughnessAddedExcluded");
        if (armorExcluded == 0 && toughnessExcluded == 0 && armorAddedExcluded == 0 && toughnessAddedExcluded == 0) return;
        event.addReductionModifier(DamageContainer.Reduction.ARMOR, (container, reduction) -> {
            var victim = event.getEntity();
            var armor = victim.getAttribute(Attributes.ARMOR);
            var toughness = victim.getAttribute(Attributes.ARMOR_TOUGHNESS);
            float fullArmor = victim.getArmorValue();
            float fullToughness = (float) victim.getAttributeValue(Attributes.ARMOR_TOUGHNESS);
            // Keep any entity-specific armor offset as well as equipment and all modifier operations.
            float remainingArmor = armor == null ? fullArmor : (float) Math.max(0,
                fullArmor - (int) armor.getValue() + (int) remaining(armor, armorExcluded, armorAddedExcluded));
            float remainingToughness = toughness == null ? fullToughness : (float) Math.max(0,
                fullToughness - toughness.getValue() + remaining(toughness, toughnessExcluded, toughnessAddedExcluded));
            float amount = container.getNewDamage();
            float fullDamage = CombatRules.getDamageAfterAbsorb(victim, amount, container.getSource(), fullArmor, fullToughness);
            float remainingDamage = CombatRules.getDamageAfterAbsorb(victim, amount, container.getSource(), remainingArmor, remainingToughness);
            // Reduction input may already contain changes from other mods; preserve their relative contribution.
            return adjust(reduction, fullDamage, remainingDamage);
        });
    }
}
