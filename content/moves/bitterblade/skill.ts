/**
 * 悔念剑 / bitterblade 的出手方式。
 *
 * 核心念头：把对世间的留恋压进剑尖，扫出一道悔恨的火弧——本族唯一的斩击，也唯一随施法者自身伤势变强：
 *   失去的生命越多，这一剑越沉、抽回的越多。剑弧扫过身前一片，弧里的敌人各挨一记。
 *
 * 两幕：
 *   起（windup，提交前）：剑尖在身体前方聚起暗红余烬、剑身压出一道火线，只播预告。
 *   斩（sweep，提交后）：把张角切成几片真实子弧，逐刻只判当前那一片（`WorldGeometry.bodyPolygon` 三角楔，判定与画面共用同一组端点）；
 *       每片先看原点之间是否真有墙（`WorldGeometry.blockHit`），每个敌人整趟只结算一次 `slash` 接触斩击。
 *       伤害的一部分经共享 `drain` 按实际伤害抽回自身；命中点另发一道向身体回流的余烬。
 *
 * 与同族分开：木角是冲撞、吸取拳是直拳、吸血是持续的咬、茶炮是远程；只有悔念剑是扇面斩击，
 *   并且把「自己残血」当燃料。配置 `sweep` 让它在宽弧清场与窄弧单点之间取舍。
 *
 * 选择是 `aim`：朝一个方向或推荐的敌人挥出一道扇形，不再要求先锁定单体；空扫或扫到墙上只出剑，方块不变。
 *
 * 命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const bitterBladeScene = "world_combat:move_bitterblade";
    const bitterBladeEdgeText = "world_combat.move.bitterblade.text.edge";
    const bitterBladeRegretText = "world_combat.move.bitterblade.text.regret";
    const bitterBladeMissText = "world_combat.move.bitterblade.text.miss";

    define({
        id: "bitterblade",
        cooldownParameter: "recharge",
        name: "Bitter Blade",
        description: "朝一个方向或敌人扫出一道悔恨的火弧：少量真实刃段依次扫过身前，弧内敌人各挨一记并汲取其生命；自身失去的生命越多，这一剑越重；墙会挡住刃光，空扫或扫墙只出剑。",
        uses: ["一扫清掉身前挤着的一群", "残血时把悔意变成更重的一剑并回血", "用一趟火弧同时压低多个目标"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.6,
        prepare: 9,
        active: 1,
        recover: 9,
        cooldown: 40,
        style: "blade",
        defaults: { sweep: false, ai: { maxChase: 6, cluster: true, hurtBelow: 0.7 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bitterblade", "reach", pokemon), geometry: "cone", orientation: "ground",
                spread: p("bitterblade", "arc", pokemon), style: "blade", color: 0xC23616,
                label: config && config.sweep === true ? "悔念剑·横扫" : "悔念剑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["bitterblade"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("bitterblade", "tempo", context)),
                recover: Math.round(p("bitterblade", "aftercast", context)),
                cooldown: Math.round(p("bitterblade", "recharge", context)),
                active: skills["bitterblade"].active,
                range: p("bitterblade", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 起手剑放在身体正前方（沿本次瞄准的水平朝向），不再是世界 +Z。
            const frame = WorldGeometry.basis(action.direction(), WorldCombat.point(0, 0, 1));
            const front = action.origin().plus(frame.forward.scale(0.35)).plus(WorldCombat.point(0, 0.55, 0));
            action.present("world_combat:bitterblade:" + action.id(), bitterBladeScene, 1, front,
                JSON.stringify({ moment: "windup", sweep: config && config.sweep === true ? 1 : 0,
                    direction: [frame.forward.x(), frame.forward.y(), frame.forward.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const scenes = WorldFeedback.actionScenes(bitterBladeScene);
            const aim = WorldGeometry.flatUnit(PokemonSkills.aim(action), action.direction());
            const power = p("bitterblade", "slash", action);
            const share = p("bitterblade", "sap", action);
            const arc = p("bitterblade", "arc", action);
            const reach = Math.max(1.6, p("bitterblade", "reach", action));
            const blade = p("bitterblade", "blade", action);
            const origin = body.position();
            const motes = Math.max(12, Math.round(power * 0.28 + share * 30));
            const scale = Math.max(0.6, Math.min(2.2, reach / 3.2));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const half = Math.max(5, Math.min(180, arc)) * Math.PI / 360;
            const base = Math.atan2(aim.x(), aim.z());
            // 少量真实子弧：张角越大分片越多，整趟仍很短。
            const steps = Math.max(4, Math.min(12, Math.round(arc / 14)));
            const lowY = origin.y() - 1.2;
            const highY = origin.y() + Math.max(1.4, blade * 3.6);
            const struck: { [ref: string]: boolean } = {};
            let hits = 0, settled = false;

            function pointAt(angle: number, radius: number): CombatPoint {
                return WorldCombat.point(origin.x() + Math.sin(angle) * radius, origin.y() + 0.12,
                    origin.z() + Math.cos(angle) * radius);
            }
            function vertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, bitterBladeScene, 1, origin.plus(aim.scale(reach)),
                        { moment: "miss", motes: motes, scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(aim.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), bitterBladeMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.2, 0)), bitterBladeRegretText,
                        [Math.round(share * 100), hits], 22);
                }
                scenes.finish(current, done);
            }
            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const a0 = base - half + 2 * half * (index / steps);
                const a1 = base - half + 2 * half * ((index + 1) / steps);
                const p0 = pointAt(a0, reach), p1 = pointAt(a1, reach);
                // 判定与画面共用这一片真实子弧的端点：原点到外弧两端张成的三角楔。
                const wedge = WorldGeometry.bodyPolygon([origin, p0, p1], lowY, highY);
                WorldGeometry.selectBodies(scope, wedge, function (victim, facts) {
                    const ref = String(victim.ref());
                    if (ref === String(actor.ref()) || scope.friendly(victim) || struck[ref]) return;
                    // 刃光被墙挡住就砍不到墙后的人（挡在原点与目标最近点之间即算挡住）。
                    if (WorldGeometry.blockHit(scope, origin, scope.closestPoint(victim, origin))) return;
                    if (!hurt(current, victim, "bitterblade", power,
                        { damage: damageSpec("bitterblade", "slash"), contact: true, slice: true, drain: share })) return;
                    struck[ref] = true;
                    hits++;
                    const at = facts.position();
                    WorldFeedback.emit(scope, bitterBladeScene, 1, at,
                        { moment: "cut", target: ref, motes: motes, scale: scale, intensity: intensity, hits: hits }, 22);
                    const inward = origin.minus(at), span = inward.length();
                    const direction = span < 0.05 ? WorldCombat.point(0, 1, 0) : inward.unit();
                    WorldFeedback.emit(scope, bitterBladeScene, 1, at,
                        { moment: "regret", target: ref, span: span, motes: motes, scale: scale,
                            direction: [direction.x(), direction.y(), direction.z()] }, 26);
                    scope.sound("cobblemon:impact.fire", at, 14, "{}");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), bitterBladeEdgeText, [], 20);
                });
                scenes.show(current, "sweep", origin,
                    { moment: "sweep", path: [vertex(origin), vertex(p0), vertex(p1)],
                        direction: [aim.x(), aim.y(), aim.z()], arc: arc, reach: reach,
                        hits: hits, motes: motes, scale: scale, intensity: intensity });
                if (index + 1 >= steps) { finish(current); return; }
                current.after(1, function (next) { step(next, index + 1); });
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            step(action, 0);
        }
    });
}
