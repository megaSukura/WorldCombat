package dev.worldcombat.cobblemon.config;

import net.neoforged.neoforge.common.ModConfigSpec;

/**
 * Pack-facing, server-authoritative tuning in {@code config/cobblemon_world_combat-server.toml}. SERVER is loaded by
 * the server only and NeoForge syncs it to every client on join, so one file on the server (or its per-world
 * {@code serverconfig} override) drives both the server simulation and the client displays; a pack can also ship a
 * {@code defaultconfigs/cobblemon_world_combat-server.toml} for first-time creation. Before a server provides the
 * values, reads return the built-in defaults. Content reads these through {@code CobblemonCombat.packConfig(key)};
 * PP capacity is applied by {@code MoveTemplatePpCapacityMixin} and {@code MovePpCapacityMixin}.
 */
public final class WorldCombatConfig {
    public static final ModConfigSpec SERVER;
    public static final ModConfigSpec.DoubleValue MOBILITY_BASE;
    public static final ModConfigSpec.DoubleValue MOBILITY_GROWTH;
    public static final ModConfigSpec.DoubleValue MOBILITY_MINIMUM;
    public static final ModConfigSpec.DoubleValue MOBILITY_MAXIMUM;
    public static final ModConfigSpec.DoubleValue PP_CAPACITY;
    public static final ModConfigSpec.IntValue ENCOUNTER_IDLE_TICKS;

    static {
        var builder = new ModConfigSpec.Builder();
        builder.push("mobility");
        MOBILITY_BASE = builder.comment(
                "Speed-stat to native navigation mapping: base multiplier applied before the cultivated speed factor.")
            .defineInRange("baseMultiplier", 1.35D, 0.0D, 10.0D);
        MOBILITY_GROWTH = builder.comment(
                "Exponent on the cultivated speed factor. 0 ignores the speed stat, 1 keeps the current behaviour, values above 1 amplify investment.")
            .defineInRange("growthInfluence", 1.0D, 0.0D, 4.0D);
        MOBILITY_MINIMUM = builder.comment("Lower clamp for the final navigation factor.")
            .defineInRange("minimumMultiplier", 0.9D, 0.0D, 10.0D);
        MOBILITY_MAXIMUM = builder.comment(
                "Upper clamp for the final navigation factor. 0 disables the cap; a positive value below minimumMultiplier is raised to that minimum.")
            .defineInRange("maximumMultiplier", 1.8D, 0.0D, 10.0D);
        builder.pop();
        builder.push("moves");
        PP_CAPACITY = builder.comment(
                "Multiplier on every move's native base PP, the value every other PP figure derives from. This is a capacity multiplier, not a PP cost. 1 keeps native values; a positive base is rounded half-up and never drops to 0, while a native 0 base stays 0.")
            .defineInRange("ppCapacityMultiplier", 1.0D, 0.1D, 10.0D);
        builder.pop();
        builder.push("encounter");
        ENCOUNTER_IDLE_TICKS = builder.comment(
                "Ticks without dealing or taking damage before combat stages and engagement reset. At least 1 because the reset window is a live effect duration; the upper bound matches the stage carrier lifetime.")
            .defineInRange("idleTicks", 600, 1, 1200000);
        builder.pop();
        SERVER = builder.build();
    }

    private WorldCombatConfig() {}

    private static double readDouble(ModConfigSpec.DoubleValue value, double fallback) {
        try {
            return value.get();
        } catch (IllegalStateException notLoaded) {
            return fallback;
        }
    }

    private static int readInt(ModConfigSpec.IntValue value, int fallback) {
        try {
            return value.get();
        } catch (IllegalStateException notLoaded) {
            return fallback;
        }
    }

    /** Read-only access for content scripts. Unknown keys are an explicit error. */
    public static double read(String key) {
        return switch (key) {
            case "mobilityBase" -> readDouble(MOBILITY_BASE, 1.35D);
            case "mobilityGrowth" -> readDouble(MOBILITY_GROWTH, 1.0D);
            case "mobilityMinimum" -> readDouble(MOBILITY_MINIMUM, 0.9D);
            case "mobilityMaximum" -> readDouble(MOBILITY_MAXIMUM, 1.8D);
            case "ppCapacity" -> readDouble(PP_CAPACITY, 1.0D);
            case "encounterIdleTicks" -> (double) readInt(ENCOUNTER_IDLE_TICKS, 600);
            default -> throw new IllegalArgumentException("Unknown pack setting: " + key);
        };
    }

    /**
     * Scales one native base PP. Identity at 1, round-half-up on a positive base. A non-positive native base is left
     * untouched: 0 is a legal native placeholder (for example an out-of-PP balance) and must not be promoted to 1.
     */
    public static int scalePp(int nativePp) {
        if (nativePp <= 0) return nativePp;
        double multiplier = readDouble(PP_CAPACITY, 1.0D);
        if (multiplier == 1.0D) return nativePp;
        return Math.max(1, (int) Math.round(nativePp * multiplier));
    }
}
