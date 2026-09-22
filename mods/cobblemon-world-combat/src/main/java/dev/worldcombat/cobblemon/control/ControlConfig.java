package dev.worldcombat.cobblemon.control;

import net.neoforged.neoforge.common.ModConfigSpec;

public final class ControlConfig {
    public static final ModConfigSpec CLIENT;
    public static final ModConfigSpec.BooleanValue MODIFIER_DIGITS;
    static {
        var builder = new ModConfigSpec.Builder();
        MODIFIER_DIGITS = builder.comment("Use the quick modifier with 1-4 instead of the four independent skill bindings.")
            .define("modifierDigits", false);
        CLIENT = builder.build();
    }
}
