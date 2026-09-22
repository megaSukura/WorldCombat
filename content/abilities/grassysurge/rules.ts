/**
 * Grassy Surge calls up a grassy field where the holder first meets an enemy.
 *
 * Main path (every combatant): a 5-block field lasts 600 ticks (30 s). Friendly bodies inside
 * recover 1/16 of their maximum health every 40 ticks (2 s), and the field feeds nearby
 * growable plants through the shared cultivation mechanism every 200 ticks (10 s), so the
 * ability changes the world itself and not only the fight.
 *
 * Pokemon layer: every grounded body in the field carries the beneficial MC MobEffect
 * world_combat:grassysurge_terrain. A trait provider turns that mark into a real hook for Pokemon
 * moves: Grass moves gain 30% power and Earthquake/Bulldoze lose half their power, matching the
 * native terrain. The heal/cleanse and the marker are separate effects so non-Pokemon get the
 * same field treatment.
 *
 * Presentation: the terrain rises as an outward wave, is kept as a low ground-level boundary, and
 * answers each heal and each ripened plant with a local flourish plus one line of text. These
 * effects read the established damage, healing and growth values; they never change them.
 *
 * Numbers: 1/16 per 2 s is the native terrain heal retimed into real time; the 30 s field and
 * the 5 block radius are one engagement. The 1.3 grass factor and 0.5 ground factor are the
 * native terrain values, kept because they are multiplier rules, not per-turn flat values.
 * Source: Cobblemon/Bulbapedia Grassy Terrain.
 */
namespace WorldCombatAbilityGrassySurge {
    var RADIUS = 5;
    var FIELD_TICKS = 600;
    var HEAL_INTERVAL = 40;
    var HEAL_RATIO = 1 / 16;
    var GROW_INTERVAL = 200;
    var MARK_TICKS = 60;
    var RULE = "world_combat:grassy_surge";
    var TERRAIN = "world_combat:grassysurge_terrain";
    var BLESSING = "world_combat:grassysurge_ground_blessing";
    var SCENE = "world_combat:ability_grassysurge";

    function restore(world: CombatWorld, actor: CombatActor): void {
        var body = world.observe(actor);
        if (!body || body.health() >= body.maxHealth()) return;
        var missing = body.maxHealth() - body.health();
        var healed = world.health(actor, Math.min(missing, body.maxHealth() * HEAL_RATIO), "world_combat:grassy_surge");
        if (healed <= 0) return;
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "heal", target: String(actor.ref()) }, 40);
        WorldFeedback.text(world, body.position(), "world_combat.ability.grassysurge.text.heal",
            [Math.round(healed * 10) / 10], 40);
    }

    function mark(world: CombatWorld, actor: CombatActor): void {
        var body = world.observe(actor);
        if (body && body.grounded()) MobEffects.apply(world, actor, TERRAIN, MARK_TICKS, 0);
    }

    function cultivate(world: CombatWorld, field: WorldEffects.Field): void {
        if (world.tick() % GROW_INTERVAL >= 5) return;
        var centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        var sites = WorldCultivation.sites(world, centre, 4);
        if (!sites.length) return;
        var site = sites[Math.floor(world.random() * sites.length)];
        if (WorldCultivation.use(world, site) !== "used") return;
        var point = WorldCombat.point(site.point[0] + 0.5, site.point[1] + 0.5, site.point[2] + 0.5);
        WorldFeedback.emit(world, SCENE, 1, point, { moment: "growth" }, 40);
        WorldFeedback.text(world, point, "world_combat.ability.grassysurge.text.growth", [], 40);
    }

    // The terrain boundary is renewed every scan (5 ticks); the feedback key owns one instance per
    // holder and its 40-tick life survives the frame without going stale.
    function sustain(world: CombatWorld, field: WorldEffects.Field): void {
        var centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
        WorldFeedback.keep(world, "field", SCENE, 1, centre, { moment: "field" }, 40);
    }

    // The semantic identity is the shared grassy-terrain identity, so this ability's ground and the
    // grassyterrain move read each other without either side naming the other's rule id.
    WorldEffects.fieldRule(RULE, {
        enter: function (world: CombatWorld, actor: CombatActor): void {
            mark(world, actor);
            if (world.friendly(actor)) restore(world, actor);
        },
        stay: function (world: CombatWorld, actor: CombatActor): void {
            mark(world, actor);
            if (world.friendly(actor) && world.tick() % HEAL_INTERVAL < 5) restore(world, actor);
        },
        leave: function (world: CombatWorld, actor: CombatActor): void { MobEffects.consume(world, actor, TERRAIN); },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            sustain(world, field);
            cultivate(world, field);
        }
    }, { identity: WorldEffects.terrain("grassyterrain"), tags: [WorldEffects.categories.terrain] });

    NativeAbilities.registry.provide("world_combat:grassysurge_ground", function (context: NativeAbilities.Context): string[] {
        if (!context.world || !context.actor) return [];
        return MobEffects.read(context.world, context.actor, TERRAIN) ? [BLESSING] : [];
    });
    NativeAbilities.define(BLESSING, {}, {
        move: function (context: NativeAbilities.Context, data: any): void {
            if (!(data.power > 0)) return;
            if (data.type === "grass") data.power *= 1.3;
            if (data.move === "earthquake" || data.move === "bulldoze") data.power *= 0.5;
        }
    });

    function established(context: NativeAbilities.Context): boolean {
        return WorldEffects.areas(context.world!, WorldEffects.terrain("grassyterrain")).length > 0;
    }

    function spread(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged || established(context)) return;
        var world = context.world!, self = context.actor!, body = world.observe(self);
        if (!body) return;
        WorldEffects.field(world, RULE, body.position(), RADIUS, {}, FIELD_TICKS);
        WorldFeedback.emit(world, SCENE, 1, body.position(), { moment: "rise" }, 50);
        WorldFeedback.text(world, body.position(), "world_combat.ability.grassysurge.text.rise", [], 50);
    }

    NativeAbilities.define("grassysurge", {}, { pulse: spread });
}
