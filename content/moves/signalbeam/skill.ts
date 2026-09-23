/**
 * 信号光束 / signalbeam —— 注册与动作。
 *
 * 核心念头：一条**沿瞄准方向拉开的信号走廊**。施法者额前点亮信号源，把光摊成一条不会拐弯的宽光带，
 * 一次照到走廊里的每个敌人；被照到的人信号错乱，出手会打散，之后还容易被错乱的信号反冲。
 *
 * 两幕：
 *   起（windup，提交前）：额前把信号收成一排亮点，只播预告。
 *   照（execute）：提交后沿瞄准方向拉出 lane 走廊，对走廊内每个非友方各结算一次 beam 伤害，按 confuseChance
 *       掷错乱（本单元自己的共享身份载体 world_combat:status/confusion），最多 maxTargets 人。
 *
 * 错乱行为（本单元自己的变体）：目标每次想出手都可能被打散（失手概率存在载体振幅里）；错乱期间它再挨任何
 * 招式命中，错乱的信号会反冲一下——按自身特攻额外掉一点血。这是信号光束区别于幻象光线（被打散时续时长）的地方。
 */
namespace PokemonSkills {
    /** 信号反冲：错乱的目标挨招时额外掉的基础比例，按自身特攻放大。skill.ts 与说明同源。 */
    const signalbeamStaticBase = 0.008;
    const signalbeamStaticPerSpecialAttack = 0.0001;

    /** 只有当代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function signalbeamCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === signalbeamEffect ? effect : null;
    }

    /** 把错乱挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function signalbeamJam(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", signalbeamEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, signalbeamScene, 1, at, { moment: "jam", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), signalbeamDazeText, [], 28);
        return true;
    }

    /** 走廊的有序顶点（近左、远左、远右、近右）；判定与画面用同一组顶点。 */
    function signalbeamLane(origin: CombatPoint, direction: CombatPoint, length: number, halfWidth: number): number[][] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x()).scale(halfWidth);
        const far = heading.scale(length);
        const y = origin.y() + 0.05;
        return [
            [origin.x() + side.x(), y, origin.z() + side.z()],
            [origin.x() + far.x() + side.x(), y, origin.z() + far.z() + side.z()],
            [origin.x() + far.x() - side.x(), y, origin.z() + far.z() - side.z()],
            [origin.x() - side.x(), y, origin.z() - side.z()]
        ];
    }

    define({
        id: signalbeamId,
        cooldownParameter: "recharge",
        name: "Signal Beam",
        description: "沿瞄准方向拉出一条信号走廊：一次照到走廊里的每个敌人，各造成一次特殊伤害，并可能让它们信号错乱。错乱期间目标出手会失手，再挨打还会被错乱的信号反冲。",
        uses: ["一次点名排成一线的多个敌人", "用宽走廊封住通道", "用脉冲模式对单个目标打重一点"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 11,
        active: 1,
        recover: 8,
        cooldown: 28,
        style: "bug",
        defaults: { pulse: false, ai: { maxChase: 17, crowd: true, finish: true } },
        fields: [flag("pulse", "脉冲")],
        indicator: function (config, pokemon) {
            return { radius: p(signalbeamId, "reach", pokemon), geometry: "line", style: "bug", color: 0xD8C24A,
                label: config && config.pulse === true ? "信号光束·脉冲" : "信号光束·连续" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[signalbeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(signalbeamId, "tempo", context)),
                recover: Math.round(p(signalbeamId, "aftercast", context)),
                cooldown: Math.round(p(signalbeamId, "recharge", context)),
                active: 1,
                range: p(signalbeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:signalbeam:windup", signalbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", pulse: config && config.pulse === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = action.range();
            const gauge = p(signalbeamId, "gauge", action);
            const power = p(signalbeamId, "beam", action);
            const chance = Math.max(0.02, Math.min(0.9, p(signalbeamId, "confuseChance", action)));
            const daze = Math.max(40, Math.round(p(signalbeamId, "dazeTicks", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p(signalbeamId, "fumble", action))) * 100);
            const motes = Math.max(12, Math.round(p(signalbeamId, "motes", action)));
            const maxTargets = Math.max(1, Math.round(p(signalbeamId, "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(2.2, gauge / 0.6));
            const intensity = Math.max(0.5, Math.min(2.2, power / 62));
            const path = signalbeamLane(origin, direction, reach, gauge);
            let hits = 0;

            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, signalbeamScene, 1, origin,
                { moment: "beam", path: path, direction: [direction.x(), direction.y(), direction.z()],
                    gauge: gauge, reach: reach, motes: motes, scale: scale, intensity: intensity }, 28);

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, gauge, { below: 1.4, above: 2.8 }),
                function (victim, facts) {
                    if (hits >= maxTargets) return;
                    if (!world.clear(origin, facts.position())) return;
                    const landed = hurt(action, victim, signalbeamId, power, { damage: damageSpec(signalbeamId, "beam") });
                    hits++;
                    if (landed) {
                        WorldFeedback.emit(world, signalbeamScene, 1, facts.position(),
                            { moment: "hit", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 22);
                        if (world.valid(victim) && world.random() < chance) signalbeamJam(world, victim, facts.position(), daze, fumblePct);
                    }
                });

            if (hits > 0) {
                sound(action, "cobblemon:impact.bug");
            } else {
                WorldFeedback.emit(world, signalbeamScene, 1, origin.plus(direction.scale(reach)),
                    { moment: "miss", gauge: gauge, scale: scale }, 22);
                WorldFeedback.text(world, origin.plus(direction.scale(reach)).plus(WorldCombat.point(0, 1, 0)), signalbeamMissText, [], 22);
            }
            done(action);
        }
    });


    // 信号反冲：带错乱的目标挨到任何招式伤害时，错乱的信号反冲一下（按自身特攻）。
    WorldCombat.on("world_combat:move_signalbeam/static", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), victim = event.target();
        if (victim === null || !world.valid(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (data.kind !== "move" || !(data.actual > 0)) return;
        if (String(data.cause || "").indexOf("signalbeam") >= 0) return;
        if (signalbeamCarrier(world, victim) === null) return;
        const body = world.observe(victim);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, victim);
        const specialAttack = facts.stats.spa || 0;
        const fraction = Math.max(0.008, Math.min(0.045, signalbeamStaticBase + specialAttack * signalbeamStaticPerSpecialAttack));
        const loss = -world.health(victim, -body.maxHealth() * fraction, "world_combat:signalbeam_static");
        if (loss <= 0) return;
        WorldFeedback.emit(world, signalbeamScene, 1, body.position(), { moment: "jolt", target: String(victim.ref()) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), signalbeamJoltText, [Math.round(loss * 10) / 10], 24);
        world.sound("cobblemon:impact.bug", body.position(), 12, "{}");
    });

    // 错乱存续期：低密度的飞鸟与电点每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_signalbeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== signalbeamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "signalbeam:jam:" + String(actor.ref()), signalbeamScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
