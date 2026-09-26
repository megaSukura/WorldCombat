/**
 * 连斩 / furycutter 的出手方式。
 *
 * 核心念头：不要停手。每一趟连斩比上一趟多挥一倍刀数——1 刀、2 刀、4 刀——层数断了就从头来。
 * 它的身份是「节奏」：玩家的操作是连续施放、别换招；对手能看见刃上的聚气一层层变密，也知道打断它就能归零。
 *
 * 幕：
 *   起（windup，提交前）：刃上聚起一层气，层数越高越亮。
 *   斩（cut → bite，提交后）：这一趟的挥刀方向在提交时锁定，朝该方向垫前一步，按 `gap` 刻挥出 `cuts` 刀；
 *       每一刀沿锁定方向的短走廊判定，左右交替，走廊里的非友方各吃一记 `bite` 接触斩击。
 *       刀数是真实结算次数，与连斩层数一致；对手在这一趟中途走出走廊，后面的刀就不再落到它身上。
 *   续（rise / drop）：这一趟有命中就继续攒层（封顶第 3 层），层数上升时刃口亮一次并浮字；
 *       整趟落空就把层数清零，层数也就此散去。
 *
 * 与同族分开：居合斩是一趟贴地的宽弧并割草，劈开是慢而准的单点重劈，十字剪是两刃合拢的交叉；
 * 连斩是唯一「越打越多刀、断招即归零」的攒节奏斩击。
 */
namespace PokemonSkills {
    /** 一刀的走廊四个角：origin 起、朝 direction 长 reach、半宽 half；判定与表现共用。 */
    function furycutterLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        freeMovement: true,
        id: furycutterId,
        cooldownParameter: "recharge",
        name: "Fury Cutter",
        description: "连续命中时攻击次数增加；落空或使用其他招式会清空累积。",
        uses: ["一趟挥出翻倍的刀数", "连续命中攒层，越接越深", "换招或落空就把层数清空"],
        kind: "aim",
        range: 2.3,
        maxRange: 2.9,
        prepare: 5,
        active: 20,
        recover: 4,
        cooldown: 22,
        style: "slash",
        defaults: { sustain: false, ai: { maxChase: 5, pressOn: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(furycutterId, "reach", pokemon), geometry: "line", style: "slash", color: 0x9AC44A,
                label: config && config.sustain === true ? "穷追连斩" : "连斩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[furycutterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(furycutterId, "tempo", context)),
                recover: Math.round(p(furycutterId, "aftercast", context)),
                cooldown: Math.round(p(furycutterId, "recharge", context)),
                active: skills[furycutterId].active,
                range: p(furycutterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const stage = furycutterStage(action.sense(), action.actor());
            action.present("world_combat:move_furycutter:windup", furycutterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", stage: stage + 1, cuts: Math.pow(2, stage), aura: 0.06 + stage * 0.03,
                    sustain: config && config.sustain === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reach = p(furycutterId, "reach", action);
            const bite = p(furycutterId, "bite", action);
            const cuts = Math.max(1, Math.min(4, Math.round(p(furycutterId, "cuts", action))));
            const gap = Math.max(2, Math.round(p(furycutterId, "gap", action)));
            const blade = p(furycutterId, "blade", action);
            const step = p(furycutterId, "step", action);
            const windowTicks = Math.max(40, Math.round(p(furycutterId, "window", action)));
            const scale = Math.max(0.6, Math.min(2.0, blade / furycutterReference));
            const intensity = Math.max(0.6, Math.min(2.4, bite / 38));
            const sparks = Math.max(4, Math.min(30, Math.round(bite * 0.5)));
            const notes = Math.max(12, Math.min(60, Math.round(cuts * 14)));
            const up = WorldCombat.point(0, 1.2, 0);
            // 提交时锁定这一趟的挥刀方向：整趟所有刀都沿它走，不会逐拍瞬转去追到身后。
            const course = aim(action);

            // 垫前一步：朝锁定方向贴近，最多停在判定边缘，避免冲过头。
            const self = world.observe(action.actor());
            if (self !== null && step > 0.05) {
                const delta = action.targetPosition().minus(self.position());
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(step, Math.max(0, flat - blade - 0.3));
                if (advance > 0.05) world.displace(action.actor(), course.scale(advance));
            }

            let landed = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), actor = current.actor();
                const body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                const stage = furycutterStage(scope, actor);
                if (landed > 0) {
                    const next = Math.min(2, stage + 1);
                    // Re-apply the carrier so the amplifier really moves (the native stack keeps the higher level).
                    const held = MobEffects.read(scope, actor, furycutterMomentum);
                    if (held !== null) scope.removeMobEffect(actor, held.id(), held.key());
                    MobEffects.apply(scope, actor, furycutterMomentum, windowTicks, next);
                    if (next > stage) {
                        WorldFeedback.emit(scope, furycutterScene, 1, at,
                            { moment: "rise", stage: next + 1, cuts: Math.pow(2, next), aura: 0.06 + next * 0.03,
                                sparks: sparks, intensity: intensity }, 20);
                        WorldFeedback.text(scope, at.plus(up), furycutterRiseText, [Math.pow(2, next)], 26);
                        sound(current, "minecraft:entity.player.attack.strong");
                    } else {
                        WorldFeedback.emit(scope, furycutterScene, 1, at, { moment: "streak", stage: next + 1, cuts: cuts }, 16);
                    }
                } else {
                    const held = MobEffects.read(scope, actor, furycutterMomentum);
                    if (held !== null && scope.removeMobEffect(actor, held.id(), held.key()))
                        WorldFeedback.emit(scope, furycutterScene, 1, at, { moment: "drop" }, 22);
                    WorldFeedback.emit(scope, furycutterScene, 1, at.plus(course.scale(reach * 0.6)),
                        { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(up), furycutterMissText, [], 22);
                }
                done(current);
            }

            function pass(current: CombatAction, index: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const origin = body.position(), direction = course;
                WorldFeedback.emit(scope, furycutterScene, 1, origin,
                    { moment: "cut", path: furycutterLane(origin, direction, reach, blade), side: index % 2 === 0 ? -1 : 1,
                        index: index, cuts: cuts, notes: notes, sparks: sparks, scale: scale, intensity: intensity,
                        direction: [direction.x(), direction.y(), direction.z()] }, 14);
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, direction, reach, blade, { below: 1.2, above: 2.2 }),
                    function (victim, facts) {
                        if (hurt(current, victim, furycutterId, bite, { damage: damageSpec(furycutterId, "bite"), contact: true, slice: true })) {
                            landed++;
                            WorldFeedback.emit(scope, furycutterScene, 1, facts.position(),
                                { moment: "bite", target: String(victim.ref()), index: index, cuts: cuts, sparks: sparks, scale: scale, intensity: intensity }, 14);
                        }
                    });
                sound(current, "minecraft:entity.player.attack.weak");
                if (index + 1 >= cuts) { finish(current); return; }
                current.after(gap, function (next: CombatAction) { pass(next, index + 1); });
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            pass(action, 0);
        }
    });
}
