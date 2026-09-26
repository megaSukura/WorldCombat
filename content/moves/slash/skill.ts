/**
 * 劈开 / slash 的出手方式。
 *
 * 核心念头：站定、把刃举到头顶，朝身前一条窄而高的竖直面压下去——慢、稳、最容易劈中要害。
 * 它的形状是一道从高处斜下、落在命中点的长刀痕；普通命中只画这一条，命中真劈中要害时再补一次更亮的强调。
 *
 * 两幕：
 *   起（windup，提交前）：举刃过头，刃尖聚起一道竖直的亮线。
 *   劈（cleave → fall → strike，提交后）：沿身前 `reach` 格长、`edge` 半宽的走廊压下一记 `cleave` 接触斩击，
 *       走廊里的非友方各挨一下；命中处画出一道由高处斜下的长刀痕。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在落点补一发亮白标记与浮字。
 *
 * 选取：`kind: "aim"` 接受任意阵营实体或世界点；横向窄、纵向高，所以旁侧不挨这一刀，高目标仍会被纵劈覆盖。
 * 与同族分开：居合斩是一趟贴地的宽弧并割草，连斩是越接越多刀的攒节奏，十字剪是两刃合拢的交叉；
 * 劈开是唯一「慢、窄、期待要害」的单点重劈。
 */
namespace PokemonSkills {
    /** 走廊四个角：origin 起、朝 direction 长 reach、半宽 half；判定与表现共用。 */
    function slashLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 命中处一记斜下长刀痕：从落点斜后上方沿刃势压到落点斜前下方，一条线读完整记竖劈。 */
    function slashStroke(point: CombatPoint, direction: CombatPoint, depth: number): number[][] {
        const heading = WorldGeometry.flatUnit(direction);
        const top = point.plus(WorldCombat.point(0, depth, 0)).minus(heading.scale(depth * 0.55));
        const bottom = point.plus(WorldCombat.point(0, -0.2, 0)).plus(heading.scale(depth * 0.35));
        return [[top.x(), top.y(), top.z()], [bottom.x(), bottom.y(), bottom.z()]];
    }

    define({
        id: slashId,
        cooldownParameter: "recharge",
        name: "Slash",
        description: "站定、举刃过头，沿身前一条窄而高的竖直面压下一记斜劈：走廊里的对手各吃一记接触斩击，命中处划出一道由高处斜下的长刀痕；普通命中只画这一条。它天生更容易劈中要害，只有真正劈中要害时落点才会再闪一记亮白标记——疾刃更快更宽、重刃更慢更重。",
        uses: ["站定一记压下去的重劈", "更容易劈中要害", "慢、窄、准"],
        kind: "aim",
        range: 2.4,
        maxRange: 2.9,
        prepare: 9,
        active: 16,
        recover: 9,
        cooldown: 34,
        style: "slash",
        defaults: { heavy: false, ai: { maxChase: 5, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(slashId, "reach", pokemon), geometry: "line", style: "slash", color: 0xF0F0F0,
                label: config && config.heavy === true ? "重刃劈开" : "劈开" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[slashId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(slashId, "tempo", context)),
                recover: Math.round(p(slashId, "aftercast", context)),
                cooldown: Math.round(p(slashId, "recharge", context)),
                active: skills[slashId].active,
                range: p(slashId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_slash:windup", slashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const reach = p(slashId, "reach", action);
            const edge = p(slashId, "edge", action);
            const depth = p(slashId, "depth", action);
            const power = p(slashId, "cleave", action);
            const notes = Math.round(p(slashId, "notes", action));
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const scale = Math.max(0.6, Math.min(2.0, edge / slashReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));

            const path = slashLane(origin, direction, reach, edge);
            let hits = 0, strike = origin.plus(direction.scale(reach));
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, edge, { below: 1.0, above: depth }),
                function (victim, facts) {
                    if (hurt(action, victim, slashId, power, { damage: damageSpec(slashId, "cleave"), contact: true, slice: true })) {
                        if (hits === 0) strike = facts.position();
                        hits++;
                        WorldFeedback.emit(world, slashScene, 1, facts.position(),
                            { moment: "strike", target: String(victim.ref()), notes: notes, scale: scale, intensity: intensity }, 18);
                    }
                });

            WorldFeedback.emit(world, slashScene, 1, origin,
                { moment: "cleave", path: path, notes: notes, hits: hits, depth: depth,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 20);
            WorldFeedback.emit(world, slashScene, 1, strike,
                { moment: "fall", path: slashStroke(strike, direction, depth), scale: scale, intensity: intensity }, 18);
            sound(action, "minecraft:entity.player.attack.strong");
            if (hits === 0) {
                WorldFeedback.emit(world, slashScene, 1, strike, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), slashMissText, [], 20);
            }
            done(action);
        }
    });

    // 要害标记：共享结算判定为暴击后，在落点补一记亮白强调与浮字（暴击率来自原生 critRatio 2）。
    // 普通命中不触发这里——只有真实 damage_applied 回执里 critical 为真、且实际伤害大于 0 时才有这一闪。
    WorldCombat.on("world_combat:move_slash/weak", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const action = event.action();
        const fromAction = action !== null && String(action.content()) === "world_combat:" + slashId;
        if (String(data.move || "") !== slashId && !fromAction) return;
        if (data.critical !== true || !(data.actual > 0)) return;
        const world = event.world(), target = event.target();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, slashScene, 1, at,
            { moment: "crit", target: String(target.ref()), marks: Math.max(1, Math.round(Math.min(3, (data.actual || 0) / 12))),
                scale: Math.max(0.7, Math.min(2.2, (data.actual || 0) / 12)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), slashWeakText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
