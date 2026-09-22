    NativeVitality.install("world_combat:vitality", function (pokemon) { return pokemon.maxHealth(); });
    NativeMobility.install("world_combat:movement", { base: 1.35, minimum: 0.9, maximum: 1.8 });
    /**
     * Pack-configured encounter idle: combat stages and engagement both reset after this window without a hit. The
     * server config can load after this script, so apply it again on every actor bind and never rely on the load-time
     * value alone. The window must be a positive effect duration and stays within the stage carrier lifetime.
     */
    function applyEncounterIdle(): void {
        var ticks = Math.round(NativeMobility.setting("encounterIdleTicks", NativeSemantics.encounterIdle));
        if (!isFinite(ticks)) ticks = NativeSemantics.encounterIdle;
        ticks = Math.max(1, Math.min(1200000, ticks));
        NativeSemantics.encounterIdle = ticks;
        if (typeof CombatStages !== "undefined") CombatStages.idleTicks = ticks;
    }
    applyEncounterIdle();
    WorldCombat.on("world_combat:world_attributes/idle", "world_combat:actor_bound", "", function () { applyEncounterIdle(); });
