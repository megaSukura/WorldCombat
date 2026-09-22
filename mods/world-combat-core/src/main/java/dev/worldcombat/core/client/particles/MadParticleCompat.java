package dev.worldcombat.core.client.particles;

import cn.ussshenzhou.madparticle.MadParticleConfig;
import cn.ussshenzhou.madparticle.particle.enums.TakeOver;
import cn.ussshenzhou.madparticle.particle.enums.TranslucentMethod;
import cn.ussshenzhou.t88.config.ConfigHelper;
import dev.worldcombat.core.WorldCombatCore;

/**
 * Keeps MadParticle's take-over switches at {@code VANILLA}. With {@code ALL}, MadParticle ticks every
 * third-party particle on worker threads and re-routes every sheet-rendered particle through its
 * instanced renderer; Cobblemon's Snowstorm storms rely on a shared static context while spawning, so
 * the parallel tick crashes the client (observed on capture), and non-{@code TextureSheetParticle}
 * particles routed to the instanced queue are never drawn. {@code VANILLA} limits both take-overs to
 * vanilla particle classes; our own particles always use {@code INSTANCED} and stay parallel.
 */
public final class MadParticleCompat {
    private static boolean applied;

    private MadParticleCompat() {}

    /**
     * Applies the safe switches once MadParticle's config is loaded, persisting the change. Mod setup
     * runs in parallel, so callers invoke this from the client tick until it reports success.
     */
    public static void ensure() {
        if (applied) return;
        MadParticleConfig current = ConfigHelper.getConfigRead(MadParticleConfig.class);
        if (current == null) return;
        applied = true;
        boolean rendering = current.takeOverRendering == TakeOver.ALL;
        boolean ticking = current.takeOverTicking == TakeOver.ALL;
        if (!rendering && !ticking) return;
        ConfigHelper.getConfigWrite(MadParticleConfig.class, config -> {
            if (config.takeOverRendering == TakeOver.ALL) config.takeOverRendering = TakeOver.VANILLA;
            if (config.takeOverTicking == TakeOver.ALL) config.takeOverTicking = TakeOver.VANILLA;
        });
        WorldCombatCore.LOGGER.info("WorldCombat set MadParticle takeOverRendering/takeOverTicking from ALL to VANILLA for Cobblemon compatibility.");
    }

    /** Switches MadParticle's translucent method at runtime; used by {@code /wcparticle oit}. */
    public static void translucent(boolean oit) {
        ConfigHelper.getConfigWrite(MadParticleConfig.class,
            config -> config.translucentMethod = oit ? TranslucentMethod.OIT : TranslucentMethod.DEPTH_TRUE);
    }

    /** One-line summary of the MadParticle switches that affect our particles. */
    public static String describe() {
        MadParticleConfig config = ConfigHelper.getConfigRead(MadParticleConfig.class);
        if (config == null) return "MadParticle config unavailable";
        return "MadParticle takeOverRendering=" + config.takeOverRendering + " takeOverTicking=" + config.takeOverTicking
            + " translucent=" + config.translucentMethod + " threads=" + config.getBufferFillerThreads()
            + " queueLimit=" + config.maxParticleAmountOfSingleQueue;
    }
}
