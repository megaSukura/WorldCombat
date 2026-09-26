let smokeHappyhourCaster = "", smokeHappyhourPartner = "", earned = 0, purse = 0, count = 0;

    WorldCombat.on("world_combat:scenario_happyhour/observe", "world_combat:actor_tick", "", event => {
        if (!smokeHappyhourCaster || String(event.actor().ref()).indexOf(smokeHappyhourCaster) !== 0) return;
        const zones = WorldEffects.areas(event.world(), "world_combat:field/happyhour")
            .filter(zone => zone.source.indexOf(smokeHappyhourCaster) === 0 || zone.source.indexOf(smokeHappyhourPartner) === 0).sort((a, b) => a.id - b.id);
        count = zones.length; earned = zones.reduce((sum, zone) => sum + (Number(zone.data.rewarded) || 0), 0);
        if (zones.length) purse = zones[0].data.purse;
    });
/** Two allied circles share one confirmed enemy death; only successful native item drops count. */
Smoke.scenario("happyhour", stage => {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone"); stage.time("night");
    const caster = stage.pokemon({ species: "meowth", level: 35, moves: ["happyhour"], at: [-2, 0, -1] });
    const partner = stage.pokemon({ species: "meowth", level: 35, moves: ["happyhour"], at: [-2, 0, 1] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.team("celebrants", [caster, partner]); stage.hostile(caster, foe); stage.hostile(partner, foe);
    smokeHappyhourCaster = caster.ref; smokeHappyhourPartner = partner.ref; earned = 0; purse = 0; count = 0;
    stage.until(600, () => stage.casts("happyhour", caster) > 0 && stage.casts("happyhour", partner) > 0 && count === 2, () => {
        stage.command("kill " + foe.ref.split("/")[0]);
        stage.until(40, () => earned > 0, () => {
            stage.expect(earned === purse, "Allied overlapping celebrations paid exactly one purse for the final death");
            stage.note("rewarded records only nonempty native dropped-item identities", { earned: earned, purse: purse, circles: count });
            stage.done();
        }, "Confirmed enemy death produces real coin entities");
    }, "Both allied celebrations were placed");
});
