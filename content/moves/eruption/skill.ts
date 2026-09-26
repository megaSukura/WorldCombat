/**
 * 喷火 / eruption 的出手方式。
 *
 * 核心念头：把积压的怒火连着自己的性命一起从地底掀出来——满血时是一次笼罩身周的火山爆发，
 * 一柱火从身上冲起、一圈冲击贴地推开，越虚弱火势越小。它不看方向、不挑目标，只看离施法者多近。
 *
 * 三幕：
 *   压（windup，提交前）：火被压进脚下，地面裂开暗红的光、身上腾起热烟，并预告与实际一致的火柱高度；起手可被打断。
 *   喷（burst → hit）：提交后整圈炸开一次；圈内每个敌人按到中心的距离衰减后各挨一次 `burst`，
 *       被沿背离方向推 `knock` 并向上抛 `lift`，按几率点上灼伤；爆心到目标的通路被完整实墙挡住时不受喷流。
 *   烬（ash）：火退去后灰烬与余烟在地面飘一会儿，只作画面，不再造成伤害。
 *
 * 命中不看方向，所以 `kind: "self"`：玩家只要站到合适的位置放开，范围就是画面里那一圈。
 */
namespace PokemonSkills {
    const eruptionScene = "world_combat:move_eruption";
    const eruptionHitText = "world_combat.move.eruption.text.hit";
    const eruptionMissText = "world_combat.move.eruption.text.miss";
    const eruptionBurnText = "world_combat.move.eruption.text.burn";

    define({
        id: "eruption",
        name: "Eruption",
        description: "把积压的火从脚下整圈掀出来：身周所有敌人（空中地上一起）被喷中并向外推开、向上抛起，越靠近中心挨得越重，还可能被点着；完整的墙会截住那一路喷流。威力随自身剩余血量下降，满血时最盛。",
        uses: ["被围住时一次把一圈人喷开", "在满血时打出最高的一记范围爆发", "把贴身的追击者推开并可能点着", "逼开成片的敌人，给自己争取空间"],
        kind: "self",
        range: 3.4,
        maxRange: 5.8,
        prepare: 14,
        active: 0,
        recover: 12,
        cooldown: 44,
        style: "volcanic",
        defaults: { ai: { maxChase: 8, cluster: true, healthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("eruption", "blastRadius", pokemon), geometry: "area", style: "volcanic",
                color: 0xFF6A2A, label: "喷火" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["eruption"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("eruption", "chargeTicks", context)),
                recover: Math.round(p("eruption", "recover", context)),
                cooldown: Math.round(p("eruption", "cooldown", context)),
                active: skills["eruption"].active,
                range: p("eruption", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("eruption:charge", eruptionScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, radius: p("eruption", "blastRadius", action),
                    column: p("eruption", "column", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.4, p("eruption", "blastRadius", action));
            const power = p("eruption", "burst", action);
            const falloff = Math.max(0.35, Math.min(0.8, p("eruption", "falloff", action)));
            const chance = p("eruption", "burnChance", action);
            const knock = p("eruption", "knock", action);
            const lift = p("eruption", "lift", action);
            const column = p("eruption", "column", action);
            const sparks = Math.max(12, Math.round(p("eruption", "sparks", action)));
            const ash = Math.max(14, Math.round(p("eruption", "ashTicks", action)));
            const scale = radius / 3.4;
            const cells = Math.round(16 + radius * 6);
            let hits = 0;

            // 垂直范围与实际火柱一致：地上与火柱高度内的空中目标都会被喷到。
            const band = { below: 2.5, above: Math.max(2.5, column) };
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, band), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref())) return;
                // 爆心到目标身体通路被完整实墙挡住：这一路不受喷流。
                if (!world.clear(centre, facts.position())) return;
                const distance = facts.position().minus(centre).length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                const burned = CombatStatus.has(world, enemy, "burn");
                if (!hurt(action, enemy, "eruption", power * strength,
                    { damage: damageSpec("eruption", "burst"), status: "burn", chance: chance * strength })) return;
                hits++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy) && away.length() > 0.15) {
                    world.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(knock * strength));
                    world.hitImpulse(enemy, WorldCombat.point(0, lift * strength, 0));
                }
                WorldFeedback.emit(world, eruptionScene, 1, facts.position(),
                    { moment: "hit", target: ref, scale: scale, strength: strength,
                        count: Math.round(8 + sparks * strength * 0.4), intensity: Math.max(0.5, Math.min(2.2, power * strength / 110)) }, 24);
                if (!burned && CombatStatus.has(world, enemy, "burn"))
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), eruptionBurnText, [], 24);
            });

            WorldFeedback.emit(world, eruptionScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, column: column, sparks: sparks, cells: cells,
                    hits: hits, intensity: Math.max(0.7, Math.min(2.4, power / 110)) }, 30);
            sound(action, "minecraft:entity.blaze.shoot");
            sound(action, "cobblemon:impact.fire");
            // 余烬是独立余波，按自己寿命留存；只作画面，不再结算。
            WorldFeedback.keep(world, "eruption:ash:" + String(actor.ref()), eruptionScene, 1, centre,
                { moment: "ash", radius: radius, scale: scale, cells: cells, sparks: sparks }, ash);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? eruptionHitText : eruptionMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
