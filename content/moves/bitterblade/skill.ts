/**
 * 悔念剑 / bitterblade 的出手方式。
 *
 * 核心念头：把对世间的留恋压进剑尖，扫出一道悔恨的火弧——本族唯一的斩击，也唯一随施法者自身伤势变强：
 *   失去的生命越多，这一剑越沉、抽回的越多。剑弧扫过身前一片，弧里的敌人各挨一记。
 *
 * 两幕：
 *   起（windup，提交前）：剑尖聚起暗红余烬、剑身压出一道火线，只播预告。
 *   斩（sweep，提交后）：朝瞄准方向推出 `arc` 度、`reach` 格的贴地火弧；弧内的非友方各吃一记 `slash` 接触斩击，
 *       伤害的一部分经共享 `drain` 抽回自身，同时沿「目标→自身」抽回一道余烬；弧内无人则只在尽头散开火星。
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

    /** 扇形弧面的有序顶点：原点 + 张角之间采样的弧点；判定用 WorldGeometry.sector，画面用同一组顶点铺多边形。 */
    function bitterBladeArc(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.max(5, Math.min(180, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.1, origin.z()]];
        for (let index = 0; index <= samples; index++) {
            const angle = base - half + 2 * half * index / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.1, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    define({
        id: "bitterblade",
        cooldownParameter: "recharge",
        name: "Bitter Blade",
        description: "朝一个方向或敌人扫出一道悔恨的火弧，弧内敌人各挨一记并汲取其生命；自身失去的生命越多，这一剑越重；空扫或扫墙只出剑。",
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
            return { radius: p("bitterblade", "reach", pokemon), geometry: "cone", style: "blade", color: 0xC23616,
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
            action.present("world_combat:bitterblade:" + action.id(), bitterBladeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", sweep: config && config.sweep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const sweep = config && config.sweep === true;
            const direction = aim(action);
            const power = p("bitterblade", "slash", action);
            const share = p("bitterblade", "sap", action);
            const arc = p("bitterblade", "arc", action);
            const reach = p("bitterblade", "reach", action);
            const blade = p("bitterblade", "blade", action);
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const path = bitterBladeArc(origin, direction, reach, arc, 12);
            const motes = Math.max(12, Math.round(power * 0.28 + share * 30));
            const scale = Math.max(0.6, Math.min(2.2, reach / 3.2));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            let hits = 0, strike = origin.plus(direction.scale(reach));

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, reach, arc, { below: 1.2, above: Math.max(1.4, blade * 3.6) }),
                function (victim: CombatActor, facts: CombatObservation) {
                    if (!hurt(action, victim, "bitterblade", power,
                        { damage: damageSpec("bitterblade", "slash"), contact: true, slice: true, drain: share })) return;
                    if (hits === 0) strike = facts.position();
                    hits++;
                    const at = facts.position();
                    const flow = origin.minus(at), span = flow.length();
                    const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                    WorldFeedback.emit(world, bitterBladeScene, 1, at,
                        { moment: "cut", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity, hits: hits }, 22);
                    WorldFeedback.emit(world, bitterBladeScene, 1, at,
                        { moment: "regret", path: ["target", "source"], target: String(victim.ref()),
                            direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, scale: scale, hits: hits }, 26);
                    sound(action, "cobblemon:impact.fire");
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.05, 0)), bitterBladeEdgeText, [], 20);
                });
            WorldFeedback.emit(world, bitterBladeScene, 1, origin,
                { moment: "sweep", path: path, direction: [direction.x(), direction.y(), direction.z()], arc: arc, reach: reach,
                    hits: hits, motes: motes, scale: scale, intensity: intensity }, 24);
            if (hits > 0) {
                WorldFeedback.emit(world, bitterBladeScene, 1, strike, { moment: "cut", motes: motes, scale: scale, intensity: intensity, hits: hits }, 20);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), bitterBladeRegretText, [Math.round(share * 100), hits], 22);
            } else {
                WorldFeedback.emit(world, bitterBladeScene, 1, origin.plus(direction.scale(reach)),
                    { moment: "miss", motes: motes, scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), bitterBladeMissText, [], 20);
            }
            done(action);
        }
    });
}
