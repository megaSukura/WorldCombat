/**
 * Corrosion eats through armor, and through Steel- and Poison-type poison immunity.
 *
 * General path (any combatant): when the holder lands a blow, the victim receives the real
 * harmful MC MobEffect `world_combat:corrosion_acid` for 120 ticks (6 s). The effect lowers the
 * vanilla armor attribute by 4 and armor toughness by 2, and its server clock removes 2% of the
 * victim's maximum health every 20 ticks. Armor is a vanilla attribute on every living body, so a
 * player in iron, an armored vanilla mob, another mod's creature and a Pokemon are all corroded
 * through the same effect. A per-victim 40-tick throttle keeps a fast combo from refreshing it
 * for free.
 *
 * Pokemon layer: an acid hit on a Steel- or Poison-type Pokemon also inflicts the shared poison
 * status through `CombatStatus.inflict`. Corrosion first opens the shared type-immunity window
 * (`NativeEffects.breakTypeImmunity`) so those types taste the poison too; an existing major status
 * is respected, and the shared native mirror ticks the poison for this status instance.
 *
 * Numbers: 6 s, -4 armor and 2% health per second is a slow burn that rewards focusing the same
 * target, not a burst. The native per-turn poison is far too strong in instant combat, so the
 * acid chip is a fraction of maximum health with a real duration.
 * Source: Cobblemon/Bulbapedia Corrosion can poison Steel and Poison types.
 *
 * Presentation: `acid` marks the hit, `poison` marks the poison landing, `acid_tick` beats
 * each second on the bearer, `acid_state` is kept while the effect holds. Numbers are unchanged.
 */
namespace WorldCombatAbilityCorrosion {
    var ACID = "world_combat:corrosion_acid";
    var SCENE = "world_combat:ability_corrosion";
    var ACID_TICKS = 120;
    var THROTTLE = 40;
    var CHIP_INTERVAL = 20;
    var CHIP_FRACTION = 0.02;
    var FEEDBACK_TICKS = 30;
    var TEXT_ACID = "world_combat.ability.corrosion.text.acid";
    var TEXT_POISON = "world_combat.ability.corrosion.text.poison";
    var TEXT_TICK = "world_combat.ability.corrosion.text.tick";
    var recent: { [ref: string]: number } = {};

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function corrode(context: NativeAbilities.Context, value: any): void {
        var world = context.world!, event: CombatWorldEvent = value.event, victim = event.target();
        if (victim === null || !world.valid(victim)) return;
        if (String(event.actor().key()) === String(victim.key()) || world.friendly(victim)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var now = world.tick(), ref = String(victim.ref());
        if (now - (recent[ref] || -1000) < THROTTLE) return;
        recent[ref] = now;
        var acidic = MobEffects.apply(world, victim, ACID, ACID_TICKS, 0) !== null;
        // The type-immunity break is the Pokemon layer; only Pokemon carry that immunity.
        var poisoned = false;
        if (String(victim.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(victim), state = NativeEffects.read(world, victim);
            var types = NativeEffects.types(pokemon, state);
            var typed = types.indexOf("steel") >= 0 || types.indexOf("poison") >= 0;
            if (typed && !CombatStatus.has(world, victim, "poison") && !String(pokemon.status())) {
                // Open the shared immunity window, then apply through the shared status route.
                NativeEffects.breakTypeImmunity(world, victim, 5);
                poisoned = CombatStatus.inflict(world, victim, "poison", undefined, undefined, { ignoreAbility: true });
            }
        }
        var body = world.observe(victim);
        if (body === null) return;
        var point = body.position();
        if (acidic) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "acid", target: ref }, 40);
            WorldFeedback.text(world, above(point), TEXT_ACID, [], FEEDBACK_TICKS);
        }
        if (poisoned) {
            WorldFeedback.emit(world, SCENE, 1, point, { moment: "poison", target: ref }, 40);
            WorldFeedback.text(world, above(point).plus(WorldCombat.point(0, 0.4, 0)), TEXT_POISON, [], FEEDBACK_TICKS);
        }
    }

    function burn(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== ACID) return;
        if (event.world().tick() % CHIP_INTERVAL !== 0) return;
        var world = event.world(), bearer = event.actor();
        if (!world.valid(bearer)) return;
        var body = world.observe(bearer);
        if (body === null) return;
        var dealt = -world.health(bearer, -Math.max(1, body.maxHealth() * CHIP_FRACTION), "world_combat:corrosion_acid");
        if (!world.valid(bearer)) return;
        body = world.observe(bearer);
        if (body === null) return;
        var ref = String(bearer.ref()), point = body.position();
        WorldFeedback.keep(world, "acid:" + ref, SCENE, 1, point, { moment: "acid_state", target: ref }, 40);
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "acid_tick", target: ref }, 22);
        if (dealt > 0) WorldFeedback.text(world, above(point), TEXT_TICK, [Math.round(dealt * 10) / 10], FEEDBACK_TICKS);
    }

    NativeAbilities.define("corrosion", {}, { corrode: corrode });
    NativeAbilities.bind("world_combat:ability_corrosion", "world_combat:damage_applied", "corrode",
        "", function (event) { return event.actor(); });
    WorldCombat.on("world_combat:ability_corrosion/tick", "world_combat:mob_effect_tick", "", burn);
}
