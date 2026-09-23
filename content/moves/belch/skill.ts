/**
 * 打嗝 / belch 的出手方式。
 *
 * 核心念头：先咬碎吞下手里那颗树果，再把压不住的一口气整团喷向前方——一团又短又宽的毒气罩住面前一片，
 * 站在气里的人都挨伤、多半中毒，气团再在原地飘一会儿。树果是这一发的燃料：手里没有树果，这一招根本使不出来。
 *
 * 三幕：
 *   起（windup，提交前）：嘴边的果香与绿沫聚起，只播预告；此时还没吃果子（`ready` 在提交前复核手里是否还有树果）。
 *   嗝（eat → belch → hit，提交后）：咬碎吞下树果（`consumeHeld` 取走它），毒气由近及远铺满整片扇形；
 *       先被罩到的人先吃伤（`gas`），按概率挂上共享中毒身份，同一目标只吃一次。
 *   散（haze）：气团在原地翻涌一段 `hazeTicks` 后散去，只作画面，不再结算。
 *
 * 与同族分开：浊雾是细而长的一束；污泥炸弹是落地插引信的爆弹；打嗝短而宽、威力高，并且被树果卡着——吃的果子本身就是这一口的代价。
 */
namespace PokemonSkills {
    const belchScene = "world_combat:move_belch";
    const belchEatText = "world_combat.move.belch.text.eat";
    const belchHitText = "world_combat.move.belch.text.hit";
    const belchMissText = "world_combat.move.belch.text.miss";
    const belchPoisonText = "world_combat.move.belch.text.poison";

    /** 以施法者为顶点、朝方向张开 arc 度的扇面顶点；判定（sector）与表现（polygon）读同一份形状。 */
    function belchCone(origin: CombatPoint, direction: CombatPoint, reach: number, arc: number): number[][] {
        var forward = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var base = Math.atan2(heading.z(), heading.x());
        var half = (arc * Math.PI / 180) / 2, steps = 7;
        var vertices: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (var i = 0; i <= steps; i++) {
            var angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y() + 0.5, origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    define({
        id: "belch",
        cooldownParameter: "recharge",
        name: "Belch",
        description: "先咬碎吞下手里那颗树果，再把压不住的一口气整团喷向前方：一团又短又宽的毒气罩住面前一片，站在气里的人都挨伤、多半中毒。手里没有树果时这一招使不出来。呛辣式中毒更多更久、残气更久，代价是威力略低。",
        uses: ["把手里那颗树果换成一次大威力的正面喷吐", "一次让身前一片人中毒", "短距离罩住一个小队", "用消耗掉的树果换取一段可观的毒属性输出"],
        kind: "enemy",
        range: 3.6,
        maxRange: 6.4,
        prepare: 7,
        active: 8,
        recover: 8,
        cooldown: 30,
        style: "belch",
        defaults: { acrid: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("belch", "reach", pokemon), geometry: "line", style: "belch",
                color: 0x8FB84A, label: config && config.acrid === true ? "呛辣打嗝" : "烈性打嗝" };
        },
        ready: function (action, config) {
            var pokemon = CobblemonCombat.pokemon(action.actor());
            return belchBerryOf(pokemon) !== null ? "" : "no-berry";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["belch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("belch", "tempo", context)),
                recover: Math.round(p("belch", "aftercast", context)),
                cooldown: Math.round(p("belch", "recharge", context)),
                active: 8,
                range: p("belch", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var pokemon = CobblemonCombat.pokemon(action.actor());
            var berry = belchBerryOf(pokemon);
            action.present("world_combat:move_belch:chew", belchScene, 1, action.origin(),
                JSON.stringify({ moment: "chew", berry: berry !== null ? 1 : 0, scale: body ? (body.width() + body.height()) / 2.3 : 1,
                    acrid: !!(config && config.acrid) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const pokemon = CobblemonCombat.pokemon(actor);
            const berry = belchBerryOf(pokemon);
            const body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            if (berry === null) {
                WorldFeedback.emit(world, belchScene, 1, origin, { moment: "miss" }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), belchMissText, [], 22);
                done(action); return;
            }
            const direction = aim(action);
            const reach = Math.max(2.4, p("belch", "reach", action));
            const arc = Math.max(40, Math.round(p("belch", "arc", action)));
            const power = p("belch", "gas", action);
            const chance = Math.max(0, Math.min(1, p("belch", "poisonChance", action)));
            const poisonTicks = Math.max(100, Math.round(p("belch", "poisonTicks", action)));
            const hazeTicks = Math.max(30, Math.round(p("belch", "hazeTicks", action)));
            const motes = Math.max(16, Math.round(p("belch", "motes", action)));
            const cap = Math.max(1, Math.round(p("belch", "maxTargets", action)));
            const scale = reach / 3.2;
            const hitRefs: { [ref: string]: boolean } = {};
            const steps = 4;
            let hits = 0, poisoned = 0;

            CobblemonCombat.consumeHeld(world, actor, String(berry.key), 1);
            sound(action, "cobblemon:item.berry.eat");
            WorldFeedback.emit(world, belchScene, 1, origin,
                { moment: "eat", target: String(actor.ref()), motes: Math.round(motes * 0.6), scale: scale }, 22);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), belchEatText, [{ key: berry.name, fallback: "berry" }], 24);

            function advance(current: CombatAction, count: number): void {
                const scope = current.world();
                const here = current.origin();
                const grow = Math.min(1, count / steps);
                const span = Math.max(0.6, reach * grow);
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(here, direction, span, arc, { below: 2, above: 3 }), function (enemy, facts) {
                    const key = String(enemy.ref());
                    if (hitRefs[key] || hits >= cap) return;
                    hitRefs[key] = true;
                    const distance = facts.position().minus(here).length();
                    const gain = Math.max(0.6, 1 - (distance / Math.max(1, reach)) * 0.35);
                    const landed = hurt(current, enemy, "belch", power * gain, { damage: damageSpec("belch", "gas") });
                    if (!landed) return;
                    hits++;
                    if (scope.valid(enemy) && scope.random() < chance
                        && CombatStatus.inflict(scope, enemy, "poison", poisonTicks, 0, { secondary: true })) {
                        poisoned++;
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), belchPoisonText, [], 24);
                    }
                    WorldFeedback.emit(scope, belchScene, 1, facts.position(),
                        { moment: "hit", target: key, motes: Math.round(motes * 0.6),
                            intensity: Math.max(0.5, Math.min(2.0, power * gain / 110)) }, 26);
                });
                WorldFeedback.keep(scope, "world_combat:move_belch:gas", belchScene, 1, here,
                    { moment: "belch", path: belchCone(here, direction, span, arc), reach: span, arc: arc,
                        scale: span / reach, motes: Math.round(motes * grow) }, 14);
                if (count >= steps) {
                    WorldFeedback.keep(scope, "world_combat:move_belch:haze", belchScene, 1, here,
                        { moment: "haze", path: belchCone(here, direction, reach, arc), reach: reach, arc: arc, scale: 1,
                            motes: motes, haze: hazeTicks }, hazeTicks);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.4, 0)),
                        hits > 0 ? belchHitText : belchMissText, hits > 0 ? [hits] : [], 26);
                    sound(current, "cobblemon:move.poisongas.actor");
                    sound(current, "minecraft:entity.player.burp");
                    done(current);
                    return;
                }
                current.after(1, function (next: CombatAction) { advance(next, count + 1); });
            }
            advance(action, 1);
        }
    });
}
