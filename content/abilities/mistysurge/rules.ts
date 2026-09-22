/**
 * Misty Surge raises a purifying mist where the holder first meets an enemy.
 *
 * Main path (every combatant): a 5-block, 30 s field (600 ticks) washes harmful MC effects
 * (wither, weakness, slowness and similar) off friendly bodies every second and purges every major
 * condition through the shared route (`CombatStatus.cure` per major identity). A condition counts
 * by its shared identity `world_combat:status/<name>`, so the shared default effect and a unit's own
 * tagged variant are washed alike; private concepts outside the major vocabulary stay with their
 * producers.
 *
 * Pokemon layer: a Pokemon's native status is the party-slot mirror of the shared effect. Purging
 * through the shared identity clears the native slot in the same tick, and a status that lands
 * through the shared route (`CombatStatus.inflict`) mirrors back automatically, so this unit never
 * writes the native slot itself.
 *
 * Mark layer: every grounded body in the field carries the beneficial MC MobEffect
 * world_combat:mistysurge_terrain. Dragon moves aimed at a marked body lose half their damage (a
 * damage_incoming listener reads the target's mark), and the gate refuses any new major status while
 * the target stands in the mist, matching the native terrain. Grounded enemies standing in it get
 * the same marker, as terrain is not one-sided.
 *
 * Presentation: the terrain rises as an outward mist wave and is kept as a low ground bank that
 * lets the fight read through it. Two local events answer with a scene and one line of text: a
 * friendly body washed clean of harmful effects, and a major status turned away by the mist.
 * These effects read the established judgement; they never change it.
 *
 * Numbers: the 1 s cleanse is a real-time read of the native end-of-turn cure; the field is one
 * engagement. Dragon x0.5 is the native terrain factor, kept because it is a multiplier rule.
 * Source: Cobblemon/Bulbapedia Misty Terrain.
 */
namespace WorldCombatAbilityMistySurge {
    var RADIUS = 5;
    var FIELD_TICKS = 600;
    var CLEANSE_INTERVAL = 20;
    var MARK_TICKS = 60;
    var RULE = "world_combat:misty_surge";
    var TERRAIN = "world_combat:mistysurge_terrain";
    var SCENE = "world_combat:ability_mistysurge";
    var HARMFUL = ["minecraft:wither", "minecraft:weakness", "minecraft:slowness",
        "minecraft:mining_fatigue", "minecraft:blindness", "minecraft:nausea", "minecraft:hunger",
        "minecraft:darkness", "minecraft:levitation", "minecraft:unluck"];

    function cleanse(world: CombatWorld, actor: CombatActor): boolean {
        // Every major identity, so the shared default effect and a unit's own tagged variant are
        // washed by the same pass. `cure` also reconciles a Pokemon's native mirror slot.
        var changed = false;
        for (var i = 0; i < StatusVocabulary.majorNames.length; i++)
            if (CombatStatus.cure(world, actor, StatusVocabulary.majorNames[i])) changed = true;
        for (var i = 0; i < HARMFUL.length; i++) if (MobEffects.consume(world, actor, HARMFUL[i])) changed = true;
        return changed;
    }

    // The wash only speaks when a body actually carried something: an untouched ally stays quiet.
    function purify(world: CombatWorld, actor: CombatActor): void {
        if (!cleanse(world, actor)) return;
        var body = world.observe(actor);
        if (!body) return;
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "cleanse", target: String(actor.ref()) }, 40);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)),
            "world_combat.ability.mistysurge.text.cleanse", [], 40);
    }

    function mark(world: CombatWorld, actor: CombatActor): void {
        var body = world.observe(actor);
        if (body && body.grounded()) MobEffects.apply(world, actor, TERRAIN, MARK_TICKS, 0);
    }

    // The mist bank is renewed every scan (5 ticks); the feedback key owns one instance per holder
    // and its 40-tick life survives the frame without going stale.
    function sustain(world: CombatWorld, field: WorldEffects.Field): void {
        var centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        WorldFeedback.keep(world, "field", SCENE, 1, centre, { moment: "field" }, 40);
    }

    // The semantic identity is the shared misty-terrain identity, so this ability's mist and the
    // mistyterrain move read each other without either side naming the other's rule id.
    WorldEffects.fieldRule(RULE, {
        enter: function (world: CombatWorld, actor: CombatActor): void {
            mark(world, actor);
            if (world.friendly(actor)) purify(world, actor);
        },
        stay: function (world: CombatWorld, actor: CombatActor): void {
            mark(world, actor);
            if (world.friendly(actor) && world.tick() % CLEANSE_INTERVAL < 5) purify(world, actor);
        },
        leave: function (world: CombatWorld, actor: CombatActor): void { MobEffects.consume(world, actor, TERRAIN); },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void { sustain(world, field); }
    }, { identity: WorldEffects.terrain("mistyterrain"), tags: [WorldEffects.categories.terrain] });

    // Shared route: any combatant standing in the mist refuses new major status conditions.
    CombatStatus.gate.define({
        id: "world_combat:ability_mistysurge",
        apply: function (context) {
            if (!context.allowed) return;
            var world = context.world, actor = context.actor;
            if (!MobEffects.read(world, actor, TERRAIN)) return;
            context.allowed = false;
            context.reason = "misty-terrain";
            var body = world.observe(actor);
            if (!body) return;
            WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "ward", target: String(actor.ref()) }, 40);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)),
                "world_combat.ability.mistysurge.text.ward", [], 40);
        }
    });
    // Dragon moves lose half their damage against any body standing in the mist; the target's mark decides, not the caster's.
    WorldCombat.on("world_combat:ability_mistysurge/ward", "world_combat:damage_incoming", "", function (event: CombatWorldEvent): void {
        var target = event.target();
        if (target === null) return;
        var data = JSON.parse(String(event.data()));
        if (data.kind !== "move" || data.type !== "dragon" || !(data.amount > 0)) return;
        var world = event.world();
        if (!MobEffects.read(world, target, TERRAIN)) return;
        data.amount *= 0.5;
        event.data(JSON.stringify(data));
    });

    function established(context: NativeAbilities.Context): boolean {
        return WorldEffects.areas(context.world!, WorldEffects.terrain("mistyterrain")).length > 0;
    }

    function raise(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged || established(context)) return;
        var world = context.world!, self = context.actor!, body = world.observe(self);
        if (!body) return;
        WorldEffects.field(world, RULE, body.position(), RADIUS, {}, FIELD_TICKS);
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "rise" }, 50);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)),
            "world_combat.ability.mistysurge.text.rise", [], 50);
    }

    NativeAbilities.define("mistysurge", {}, { pulse: raise });
}
