/**
 * 喷火 / eruption 的出手方式。
 *
 * 核心念头：把积压的怒火连着自己的性命一起从地底掀出来——满血时是一次笼罩身周的火山爆发，
 * 一柱火从身上冲起、一圈冲击贴地推开，越虚弱火势越小。它不看方向、不挑目标，只看离施法者多近。
 *
 * 三幕：
 *   压（windup，提交前）：火被压进脚下，地面裂开暗红的光、身上腾起热烟，并预告与实际一致的火柱高度；起手可被打断。
 *   喷（burst → hit）：提交后整圈炸开一次；圈内每个敌人按到中心的水平距离衰减后各挨一次 `burst`，
 *       被沿背离方向推 `knock` 并施加向上的 `lift` 初速，按几率点上灼伤；爆心到目标的通路被完整实墙挡住时不受喷流。
 *       `lift` 是初速而不是保证高度，纯上下方向的受体只跳过水平推，垂直项照常。
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
        description: "把积压的火从脚下整圈掀出来：身周所有敌人（空中地上一起）被喷中并向外推开、向上掀起，越靠近中心挨得越重，还可能被点着；完整的墙会截住那一路喷流。威力随自身剩余血量下降，满血时最盛。",
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
            // 预告圈与预告柱都从真实脚面起，与提交后的柱高、伤害高度带共用同一原点。
            const body = action.sense().observe(action.actor());
            const half = body !== null ? body.height() / 2 : 0.7;
            const drop = body !== null ? body.boundsMin().y() - action.origin().y() : -half;
            const column = Math.max(0.5, p("eruption", "column", action));
            action.present("eruption:charge", eruptionScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, radius: p("eruption", "blastRadius", action),
                    column: column, drop: drop, span: Math.max(0.5, -drop + column) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            // 判定圈、贴地圈与火柱共用同一脚面原点与柱顶：从脚面到身体中心以上 column 的空中目标都会被喷到。
            const half = body !== null ? body.height() / 2 : 0.7;
            const drop = body !== null ? body.boundsMin().y() - centre.y() : -half;
            const foot = WorldCombat.point(centre.x(), centre.y() + drop, centre.z());
            const radius = Math.max(2.4, p("eruption", "blastRadius", action));
            const power = p("eruption", "burst", action);
            const falloff = Math.max(0.35, Math.min(0.8, p("eruption", "falloff", action)));
            const chance = p("eruption", "burnChance", action);
            const knock = p("eruption", "knock", action);
            const lift = p("eruption", "lift", action);
            const column = Math.max(0.5, p("eruption", "column", action));
            const span = Math.max(0.5, -drop + column);
            const sparks = Math.max(12, Math.round(p("eruption", "sparks", action)));
            const ash = Math.max(14, Math.round(p("eruption", "ashTicks", action)));
            const scale = radius / 3.4;
            const cells = Math.round(16 + radius * 6);
            let hits = 0;

            // 判定圈与可见圈同一个脚面原点：圈内从脚面到火柱顶的空中目标都会被喷到，半径只缩放一次。
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(foot, 0, radius, { below: 0.5, above: span }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref())) return;
                // 爆心到目标身体通路被完整实墙挡住：这一路不受喷流。
                if (!world.clear(centre, facts.position())) return;
                const side = WorldCombat.point(facts.position().x() - foot.x(), 0, facts.position().z() - foot.z());
                const distance = side.length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                const burned = CombatStatus.has(world, enemy, "burn");
                if (!hurt(action, enemy, "eruption", power * strength,
                    { damage: damageSpec("eruption", "burst"), status: "burn", chance: chance * strength })) return;
                hits++;
                if (world.valid(enemy)) {
                    // 水平分量接近零（受体几乎正上/正下）时只省水平推，垂直初速照给，后续流程继续。
                    if (side.length() > 0.15) world.hitDisplace(enemy, side.unit().scale(knock * strength));
                    world.hitImpulse(enemy, WorldCombat.point(0, lift * strength, 0));
                }
                WorldFeedback.emit(world, eruptionScene, 1, facts.position(),
                    { moment: "hit", target: ref, scale: scale, strength: strength,
                        count: Math.round(8 + sparks * strength * 0.4), intensity: Math.max(0.5, Math.min(2.2, power * strength / 110)) }, 24);
                if (!burned && CombatStatus.has(world, enemy, "burn"))
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), eruptionBurnText, [], 24);
            });

            WorldFeedback.emit(world, eruptionScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, column: column, drop: drop, span: span,
                    sparks: sparks, cells: cells, hits: hits, intensity: Math.max(0.7, Math.min(2.4, power / 110)) }, 30);
            sound(action, "minecraft:entity.blaze.shoot");
            sound(action, "cobblemon:impact.fire");
            // 余烬是独立余波，按自己寿命留存；只作画面，不再结算。
            WorldFeedback.keep(world, "eruption:ash:" + String(actor.ref()), eruptionScene, 1, centre,
                { moment: "ash", radius: radius, scale: scale, drop: drop, cells: cells, sparks: sparks }, ash);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? eruptionHitText : eruptionMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
