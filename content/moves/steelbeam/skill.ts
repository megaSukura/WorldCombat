/**
 * 铁蹄光线 / steelbeam 的出手方式。
 *
 * 核心念头：**把全身的钢铁剥下来铸成一根梁射出去**——不是细长贯穿，而是重而短的一记钢梁，把走廊里第一个
 * 活体钉住、撞飞；代价是身上那层钢本身：**固定比例的最大生命，落地即结，打空也照付**。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：全身表层的钢光向身前收拢、脚下起屑，只播预告，此时代价未结清；收拢的金属量随 `cost` 可见。
 *   铸（lance → impact / fizzle / wall）：提交后钢梁沿准线射出。先用真实身体几何挑出走廊里离自己最近的一个
 *       非友方——按梁面到对方真实碰撞箱的接触距离，而不是中心距，宽体 Boss 的体表更近时也能排在第一；
 *       再让钢梁的判定与画面一起收束到首敌（或第一面墙）的真实接触处就停。命中结算 `lance` 伤害并沿射向把
 *       它撞开 `knock` 格；打空在尽头散光，撞墙在墙面迸屑。
 *   剥（shed）：钢梁出手后，施法者身上崩落钢屑、血色骤降——**只有真的扣了血才散甲片**，扣除最大生命 ×`cost`。
 *
 * 与同族分开：破坏光线细长贯穿、代价是熄火；破灭之光粗重贯穿、代价随伤害走；叶绿爆震扇形放光。
 * 铁蹄光线只打第一个目标，却有最不可躲的一笔自损，玩家凭「放完自己掉一半血」认出它。
 *
 * 选取 `kind: "aim"`：可朝任意方向或世界点抛梁，也能空放；命中权限仍由命中层按敌我结算。
 */
namespace PokemonSkills {
    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四角；判定与表现共用这组顶点。 */
    function steelbeamLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(direction.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function steelbeamPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: steelbeamId,
        cooldownParameter: "recharge",
        name: "Steel Beam",
        description: "朝任意方向或世界点抛出一道钢梁，被真实方块挡下时在墙面截断；只伤害最近的一个敌人并把它推开。无论是否命中，出手后都按最大生命比例结算自损。",
        uses: ["把全身的钢铸成一记重梁砸出去", "用最大生命比例的自损换取一记远程重击", "命中并把挡路的目标撞开"],
        kind: "aim",
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
            const percent = pokemon ? Math.round(p(steelbeamId, "cost", pokemon) * 100) : 50;
            return { radius: pokemon ? p(steelbeamId, "reach", pokemon) : 9, geometry: "line", style: "beam",
                color: 0xBFE4FF, label: (config && config.temper === true ? "淬火式铁蹄光线" : "全抛式铁蹄光线") + " · 自损 " + percent + "%" };
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
            const cost = Math.max(0, Math.min(1, p(steelbeamId, "cost", action)));
            action.present("world_combat:move_steelbeam:gather", steelbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", temper: config && config.temper === true ? 1 : 0,
                    drain: Math.round(6 + cost * 44),
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

            // 直线受真实方块遮挡：clipBlocks 给出射线上第一个方块格；有挡墙就把走廊截断在墙面。
            const fullEnd = origin.plus(direction.scale(reach));
            const clip = world.clipBlocks(origin, fullEnd);
            const wall = clip !== null && clip.blocked() ? clip : null;
            const laneReach = clip === null ? 0 : wall !== null ? wall.position().minus(origin).length() : reach;

            // 首敌按梁面到真实身体碰撞箱的接触距离挑选：宽体 Boss 的体表更近时排在第一，而不是中心最近的人。
            const found: { actor: CombatActor; at: CombatPoint; along: number }[] = [];
            if (half > 0.01 && laneReach > 0.001) {
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(origin, origin.plus(direction.scale(laneReach)), half),
                    function (enemy: CombatActor, facts: CombatObservation) {
                        if (world.friendly(enemy) || String(enemy.ref()) === String(actor.ref())) return;
                        if (!world.clear(origin, facts.position())) return;
                        const offset = world.closestPoint(enemy, origin).minus(origin);
                        const along = Math.max(0, offset.x() * direction.x() + offset.y() * direction.y() + offset.z() * direction.z());
                        found.push({ actor: enemy, at: facts.position(), along: along });
                    });
            }
            found.sort(function (a, b) { return a.along - b.along; });
            const first = found.length > 0 ? found[0] : null;

            // 钢梁在首敌或墙面处收束：判定与画面读同一条截断到真实接触的线，不再把梁画穿首敌。
            const beamLength = first !== null ? Math.max(0.05, Math.min(laneReach, first.along)) : laneReach;
            const vertices = steelbeamLane(origin, direction, beamLength, half);
            const tip = origin.plus(direction.scale(beamLength));
            let hits = 0;

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, steelbeamScene, 1, origin,
                { moment: "lance", path: steelbeamPath(vertices), direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity, shards: shards, reach: beamLength,
                    blocked: wall !== null ? 1 : 0,
                    notes: Math.round(40 + power * 0.5) }, 26);

            if (first !== null) {
                if (hurt(action, first.actor, steelbeamId, power, { damage: damageSpec(steelbeamId, "lance") })) {
                    hits++;
                    if (world.valid(first.actor)) world.hitDisplace(first.actor, direction.scale(knock));
                    WorldFeedback.emit(world, steelbeamScene, 1, first.at,
                        { moment: "impact", target: String(first.actor.ref()), shards: shards, scale: scale,
                            intensity: intensity }, 26);
                    sound(action, "cobblemon:impact.steel");
                    WorldFeedback.text(world, first.at.plus(WorldCombat.point(0, 1.2, 0)), steelbeamHitText, [Math.round(knock * 10) / 10], 26);
                }
            }

            if (hits === 0) {
                if (wall !== null) {
                    // 撞墙：在真实方块格与表面迸屑，不再把钢梁画穿墙体。
                    const cell = wall.blockPosition();
                    WorldFeedback.emit(world, steelbeamScene, 1, wall.position(),
                        { moment: "wall", shards: shards, scale: scale, face: wall.blockFace(),
                            block: cell !== null ? [cell.x(), cell.y(), cell.z()] : undefined }, 22);
                } else {
                    WorldFeedback.emit(world, steelbeamScene, 1, tip, { moment: "fizzle", shards: shards, scale: scale }, 20);
                    WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.8, 0)), steelbeamMissText, [], 22);
                }
            }

            const body = world.observe(actor);
            if (body !== null) {
                const lost = -world.health(actor, -body.maxHealth() * cost, "world_combat:steelbeam_shed");
                if (lost > 0) {
                    // 只有真的扣了血才散甲片：崩落量按实际失血，不再按名义比例预演。
                    const count = Math.max(8, Math.round(shards * Math.min(2, lost / Math.max(1, body.maxHealth() * 0.25))));
                    WorldFeedback.emit(world, steelbeamScene, 1, body.position(),
                        { moment: "shed", shards: shards, count: count, loss: Math.round(lost * 10) / 10,
                            scale: scale, cost: cost, hits: hits,
                            intensity: Math.max(0.6, Math.min(2.6, cost * 3 + intensity * 0.4)) }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), steelbeamShedText,
                        [Math.round(cost * 100)], 28);
                }
            }
            sound(action, "minecraft:block.anvil.land");
            done(action);
        }
    });
}
