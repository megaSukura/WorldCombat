package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.Appearance;
import dev.worldcombat.core.world.WorldAttributes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native arithmetic and normalized visual data; no authored move or visual-approval assertions. */
public final class NativeAttributeAppearanceChecks {
    public static void run(ServerLevel level) {
        var entity = mob(EntityType.COW, level, 5);
        try {
            var armor = entity.getAttribute(Attributes.ARMOR);
            armor.setBaseValue(0);
            armor.addTransientModifier(new AttributeModifier(ResourceLocation.parse("checks:base"), .5, AttributeModifier.Operation.ADD_MULTIPLIED_BASE));
            armor.addTransientModifier(new AttributeModifier(ResourceLocation.parse("checks:total"), 1, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL));
            var before = WorldAttributes.observe(armor);
            require(before.value() == 0 && before.additionMultiplier() == 3, "Zero native value lost its additive slope");
            armor.addTransientModifier(new AttributeModifier(ResourceLocation.parse("checks:grant"), 4, AttributeModifier.Operation.ADD_VALUE));
            var after = WorldAttributes.observe(armor);
            require(after.value() == 12 && after.unclampedValue() == 12, "Native additive compensation used the wrong arithmetic");
            armor.setBaseValue(100);
            var capped = WorldAttributes.observe(armor);
            require(capped.value() == 30 && capped.unclampedValue() == 312, "Native range clamp hid the raw contribution");
        } finally { entity.discard(); }
        var legacy = Appearance.of("{\"sprite\":\"minecraft:flash\",\"spin\":true}");
        require(legacy.spinRate() == 4, "Legacy spin changed its rate");
        var clockwise = Appearance.of("{\"sprite\":\"minecraft:flash\",\"spin\":36}");
        require(clockwise.spinRate() == 36 && Appearance.of(clockwise.json()).spinRate() == 36, "Numeric spin did not survive native tracking data");
        var reverse = Appearance.of("{\"sprite\":\"minecraft:flash\",\"spin\":-2.5}");
        require(reverse.spinAngle(360, .5f, 0) == -181.25f, "Non-integer spin reset at an arbitrary tick boundary");
        require(!Appearance.of("{\"sprite\":\"minecraft:flash\",\"spin\":false}").spin(), "Explicit static appearance rotates");
        mark("Native attribute snapshots and appearance data verified: zero slope basis, composed modifiers, clamp facts, numeric spin and interpolation");
    }
}
