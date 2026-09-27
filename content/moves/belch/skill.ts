/** One actually consumed berry powers one short, fixed-origin gas cone; residual haze is visual. */
namespace PokemonSkills {
    const belchScene = "world_combat:move_belch";
    const belchEatText = "world_combat.move.belch.text.eat";
    const belchHitText = "world_combat.move.belch.text.hit";
    const belchMissText = "world_combat.move.belch.text.miss";
    const belchPoisonText = "world_combat.move.belch.text.poison";

    /** 沿弹道第一面真实墙的距离；畅通则到 reach。视觉锥在此截断，与命中视线一致（clipBlocks 畅通也返回 MISS，须看 blocked）。 */
    function belchClearance(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, reach: number): number {
        const wall = WorldGeometry.blockHit(world, origin, origin.plus(direction.scale(reach)));
        return wall !== null ? Math.max(0.2, wall.position().minus(origin).length()) : reach;
    }
    function belchVictims(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, reach: number, arc: number,
        visit: (actor: CombatActor, facts: CombatObservation) => void): void {
        const cos = Math.cos(arc * Math.PI / 360), reachBox = WorldCombat.point(reach, reach, reach);
        world.queryBox(origin.minus(reachBox), origin.plus(reachBox), false).forEach(actor => {
            if (world.friendly(actor)) return;
            const facts = world.observe(actor); if (!facts) return;
            const offset = facts.position().minus(origin), projection = offset.x() * direction.x() + offset.y() * direction.y() + offset.z() * direction.z();
            const probe = world.closestPoint(actor, origin.plus(direction.scale(Math.max(0, Math.min(reach, projection)))));
            const delta = probe.minus(origin), distance = delta.length();
            if (distance > reach || distance > .001 && (delta.x() * direction.x() + delta.y() * direction.y() + delta.z() * direction.z()) / distance < cos) return;
            if (world.clear(origin, probe)) visit(actor, facts);
        });
    }

    define({
        id: "belch",
        cooldownParameter: "recharge",
        name: "Belch",
        description: "先咬碎吞下手里那颗树果，再把压不住的一口气整团喷向前方：一团又短又宽的毒气罩住面前一片，站在气里的人都挨伤、多半中毒。手里没有树果时这一招使不出来。呛辣式中毒更多更久，代价是威力略低、出手与冷却更慢。",
        uses: ["把手里那颗树果换成一次大威力的正面喷吐", "一次让身前一片人中毒", "短距离罩住一个小队", "用消耗掉的树果换取一段可观的毒属性输出"],
        kind: "aim",
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
            return belchBerryOf(action.sense(), action.actor()) !== null ? "" : "no-berry";
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
            var berry = belchBerryOf(action.sense(), action.actor());
            action.present("world_combat:move_belch:chew", belchScene, 1, action.origin(),
                JSON.stringify({ moment: "chew", berry: berry !== null ? 1 : 0, scale: body ? (body.width() + body.height()) / 2.3 : 1,
                    acrid: !!(config && config.acrid) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const berry = belchBerryOf(world, actor);
            const body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            if (berry === null || !NativeItems.consumeHeld(world, actor, berry.held, 1).ok) {
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

            NativeItems.eat(world, actor, berry.berry, 1, 0, "belch");
            sound(action, "cobblemon:item.berry.eat");
            WorldFeedback.emit(world, belchScene, 1, origin,
                { moment: "eat", target: String(actor.ref()), motes: Math.round(motes * 0.6), scale: scale }, 22);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), belchEatText, [{ key: berry.berry.name, fallback: "berry" }], 24);

            function advance(current: CombatAction, count: number): void {
                const scope = current.world();
                const here = origin;
                const grow = Math.min(1, count / steps);
                const span = Math.max(0.6, Math.min(reach * grow, belchClearance(scope, here, direction, reach)));
                const half = arc / 2;
                belchVictims(scope, here, direction, span, arc, function (enemy, facts) {
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
                // 毒团体积与判定共用同一组方向/长度/半角；每刻只发当刻真实截面。
                const heading = [direction.x(), direction.y(), direction.z()];
                WorldFeedback.keep(scope, "world_combat:move_belch:gas", belchScene, 1, here,
                    { moment: "belch", direction: heading, length: span, half: half,
                        motes: Math.round(motes * grow), scale: span / reach }, 12);
                // 明确前缘：锥底真实位置与真实张角，不随粒子飘散而变形。
                const front = here.plus(direction.scale(span));
                WorldFeedback.keep(scope, "world_combat:move_belch:front", belchScene, 1, front,
                    { moment: "belch_front", direction: heading,
                        radius: Math.max(0.12, span * Math.tan(half * Math.PI / 180) + 0.18),
                        motes: Math.round(motes * grow), scale: span / reach }, 12);
                if (count >= steps) {
                    WorldFeedback.keep(scope, "world_combat:move_belch:haze", belchScene, 1, here,
                        { moment: "haze", direction: heading, length: reach, half: half, reach: reach, arc: arc, scale: 1,
                            motes: Math.round(motes * 0.5), haze: hazeTicks }, hazeTicks);
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
