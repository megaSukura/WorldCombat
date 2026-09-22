/** Test fixture: server behavior for the native checks:mob_effect_sample effect. */
namespace MobEffectSample {
    var EFFECT = "checks:mob_effect_sample";

    // While the effect is present on a victim, taking a hit refreshes short speed on that victim.
    MobEffects.react("checks:mob_effect_sample/reaction", EFFECT, "world_combat:damage_applied",
        function (event) { return event.target(); },
        function (event, actor, state) {
            MobEffects.apply(event.world(), actor, "minecraft:speed", 40, state.amplifier());
        });

    // The native effect clock raises this event; act only for our effect id.
    WorldCombat.on("checks:mob_effect_sample/tick", "world_combat:mob_effect_tick", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        MobEffects.apply(event.world(), event.actor(), "minecraft:glowing", 30, 0);
    });
}
