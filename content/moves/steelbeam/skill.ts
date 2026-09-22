/**
 * 铁蹄光线 / steelbeam 的出手方式。
 *
 * 核心念头：**把全身的钢铁剥下来铸成一根梁射出去**——不是细长贯穿，而是重而短的一记钢梁，把走廊里第一个
 * 活体钉住、撞飞；代价是身上那层钢本身：**固定比例的最大生命，落地即结，打空也照付**。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：全身的钢片向身前收拢、脚下起屑，只播预告，此时代价未结清。
 *   铸（lance → impact / fizzle）：提交后钢梁沿准线射出，用与表现同一组顶点围出的走廊判定，命中走廊里
 *       离自己最近的一个非友方，结算 `lance` 伤害并沿射向把它撞开 `knock` 格；打空只在尽头留一下散光。
 *   剥（shed）：钢梁出手后，施法者身上崩落 `shards` 片钢屑、血色骤降——扣除最大生命 ×`cost`（浮字提示）。
 *
 * 与同族分开：破坏光线细长贯穿、代价是熄火；破灭之光粗重贯穿、代价随伤害走；叶绿爆震扇形放光。
 * 铁蹄光线只打第一个目标，却有最不可躲的一笔自损，玩家凭「放完自己掉一半血」认出它。
 */
namespace PokemonSkills {
    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这组顶点。 */
    function steelbeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function steelbeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: steelbeamId,
        name: "Steel Beam",
        description: "The user fires a beam of steel that it collected from its entire body. This also damages the user.",
        uses: ["把全身的钢铸成一记重梁砸出去", "用固定的一笔自损换一次必中的重击", "命中并把挡路的目标撞开"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 12,
        active: 20,
        recover: 10,
        cooldown: 50,
        maximumTicks: 220,
        style: "beam",
        defaults: { temper: false, ai: { maxChase: 11, minHealth: 0.55 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(steelbeamId, "reach", pokemon) : 9, geometry: "line", style: "beam",
                color: 0xBFE4FF, label: config && config.temper === true ? "淬火式铁蹄光线" : "全抛式铁蹄光线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[steelbeamId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(steelbeamId, "tempo", context)),
                recover: Math.round(p(steelbeamId, "aftercast", context)),
                cooldown: Math.round(p(steelbeamId, "recharge", context)),
                active: skills[steelbeamId].active,
                range: p(steelbeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_steelbeam:gather", steelbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", temper: config && config.temper === true ? 1 : 0,
                    shards: Math.round(p(steelbeamId, "shards", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(1, p(steelbeamId, "reach", action));
            const half = Math.max(0.1, p(steelbeamId, "width", action));
            const power = p(steelbeamId, "lance", action);
            const cost = Math.max(0, Math.min(1, p(steelbeamId, "cost", action)));
            const knock = Math.max(0, p(steelbeamId, "knock", action));
            const shards = Math.max(1, Math.round(p(steelbeamId, "shards", action)));
            const scale = half / 0.85;
            const intensity = Math.max(0.6, Math.min(2.6, power / 140));
            const vertices = steelbeamLane(origin, direction, reach, half);
            const tip = origin.plus(direction.scale(reach));
            let hits = 0;

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, steelbeamScene, 1, origin,
                { moment: "lance", path: steelbeamPath(vertices), direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity, shards: shards, reach: reach, notes: Math.round(40 + power * 0.5) }, 26);

            if (half > 0.01) {
                const region = WorldGeometry.polygon(vertices, { below: 2, above: 3 });
                const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                    if (!world.clear(origin, facts.position())) return;
                    candidates.push({ actor: enemy, at: facts.position() });
                });
                candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                if (candidates.length > 0) {
                    const first = candidates[0];
                    if (hurt(action, first.actor, steelbeamId, power, { damage: damageSpec(steelbeamId, "lance") })) {
                        hits++;
                        if (world.valid(first.actor)) world.displace(first.actor, direction.scale(knock));
                        WorldFeedback.emit(world, steelbeamScene, 1, first.at,
                            { moment: "impact", target: String(first.actor.ref()), shards: shards, scale: scale,
                                intensity: intensity }, 26);
                        sound(action, "cobblemon:impact.steel");
                        WorldFeedback.text(world, first.at.plus(WorldCombat.point(0, 1.2, 0)), steelbeamHitText, [Math.round(knock * 10) / 10], 26);
                    }
                }
            }

            if (hits === 0) {
                WorldFeedback.emit(world, steelbeamScene, 1, tip, { moment: "fizzle", shards: shards, scale: scale }, 20);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), steelbeamMissText, [], 22);
            }

            const body = world.observe(actor);
            if (body !== null) {
                const lost = body.maxHealth() * cost;
                world.health(actor, -lost, "world_combat:steelbeam_shed");
                WorldFeedback.emit(world, steelbeamScene, 1, body.position(),
                    { moment: "shed", shards: shards, scale: scale, cost: cost, hits: hits,
                        intensity: Math.max(0.6, Math.min(2.6, cost * 3 + intensity * 0.4)) }, 30);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), steelbeamShedText,
                    [Math.round(cost * 100)], 28);
            }
            sound(action, "minecraft:block.anvil.land");
            done(action);
        }
    });
}
