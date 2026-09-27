/**
 * 治愈波动 / Heal Pulse —— 执行组织。
 *
 * 核心念头：从自己身上推出一圈治愈的波动，它向伙伴赶路、贴上身体才化成一口生命；它是**赶路来的**——越远到得越晚，
 *   这一段路就是对手的余地，墙也能把它截断。
 *
 * 出手：共享节奏。windup（提交前）只播预告——胸口先聚起一圈温光；准备可被打断，不花代价。
 * 送出（提交后）：波前离开施术者并向伙伴的**当前位置**推进，每刻走 pulseSpeed 格，方向以有限速率转向伙伴；
 *   它有自己的行程预算（出招那一刻的距离 ÷ 速度，保留原施放的总路程）。沿途若撞上实心方块，波在被墙挡住的实际接触点散掉；
 *   伙伴跑得太远、行程耗尽、离场或不再友方，这一口落空。画面读到的正是每刻真实推进的波前与刚扫过的一小段，判定与表现共用同一端点。
 * 结果：波前真正贴上伙伴身体的一刻才兑现——仍活着、仍是友方、仍在 reach 之内就按 heal 回复并播放 wash（粒子数量随实际回复量）；
 *   否则落空（fizzle，PP 与冷却照付）。波不作实体。
 *
 * 反制：等待期就是余地——对手可以在波动抵达前把残血伙伴带走，或把它拉出射程让波落空；墙也能截断这条波。
 * 与同族分开：花疗是花瓣当场在伤者身上绽开；治愈波动是一圈**要赶一段路**的波，距离越远越慢，吃时机。
 */
namespace PokemonSkills {
    const healpulseScene = "world_combat:move_healpulse";
    const healpulseTextWash = "world_combat.move.healpulse.text.wash";
    const healpulseTextFull = "world_combat.move.healpulse.text.full";
    const healpulseTextFizzle = "world_combat.move.healpulse.text.fizzle";
    /** 波前每刻最多转过的角度（度/刻）：有限转向追踪，跑位快过它的伙伴能把波甩开。 */
    const healpulseTurn = 14;

    function healpulseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    function healpulseUnit(delta: CombatPoint): CombatPoint {
        const length = delta.length();
        return length > 0.0001 ? delta.scale(1 / length) : WorldCombat.point(0, 1, 0);
    }

    /** 把单位方向 `from` 朝单位方向 `to` 转过至多 maxDegrees 度（罗德里格斯旋转），保持单位长度。 */
    function healpulseTurnToward(from: CombatPoint, to: CombatPoint, maxDegrees: number): CombatPoint {
        const dot = from.x() * to.x() + from.y() * to.y() + from.z() * to.z();
        const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
        if (angle <= maxDegrees + 0.001) return to;
        let axis = WorldCombat.point(from.y() * to.z() - from.z() * to.y(),
            from.z() * to.x() - from.x() * to.z(), from.x() * to.y() - from.y() * to.x());
        const axisLength = axis.length();
        if (axisLength < 1e-6) return to;
        axis = axis.scale(1 / axisLength);
        const rad = maxDegrees * Math.PI / 180, cosine = Math.cos(rad), sine = Math.sin(rad);
        const cross = WorldCombat.point(axis.y() * from.z() - axis.z() * from.y(),
            axis.z() * from.x() - axis.x() * from.z(), axis.x() * from.y() - axis.y() * from.x());
        const along = axis.x() * from.x() + axis.y() * from.y() + axis.z() * from.z();
        return healpulseUnit(from.scale(cosine).plus(cross.scale(sine)).plus(axis.scale(along * (1 - cosine))));
    }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function healpulseHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: healpulseId, name: "治愈波动",
        description: "从自己身上推出一圈治愈波动，沿瞄准线赶向选定的友方；抵达其身体时回复其最大生命的一半左右。波前以波动速度逐刻向伙伴追去、有限转向，飞行途中撞上墙就在墙前散掉，伙伴被拉出射程、跑光总路程或抢在抵达前倒下，这一口就落空。",
        uses: ["远远地给伙伴补一口", "在伙伴被打倒之前把生命送到", "用飞行的波动跨过一段距离的救助"],
        kind: "friend", range: 6, maxRange: 11, prepare: 9, active: 1, recover: 8, cooldown: 120, style: "pulse", maximumTicks: 240,
        defaults: { overcharge: false },
        fields: [flag("overcharge", "超载")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[healpulseId], detail: { values: config } };
            return { radius: p(healpulseId, "pulseRadius", context), geometry: "point", style: "pulse", color: 0x8FD8E8,
                label: config && config.overcharge === true ? "超载波动" : "治愈波动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[healpulseId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const overcharge = !!(config && config.overcharge);
            return {
                prepare: Math.max(4, Math.round(p(healpulseId, "charge", context))),
                recover: Math.max(3, Math.round(p(healpulseId, "settle", context))),
                cooldown: Math.round(p(healpulseId, "cooldown", context) * (overcharge ? 1.08 : 0.95)),
                active: 1,
                range: p(healpulseId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("healpulse:windup", healpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", motes: p(healpulseId, "motes", action), radius: p(healpulseId, "pulseRadius", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (!body || target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) { done(action); return; }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const overcharge = !!(config && config.overcharge);
            const fraction = Math.max(0, Math.min(1, p(healpulseId, "heal", action)));
            const speed = Math.max(0.2, p(healpulseId, "pulseSpeed", action));
            const radius = Math.max(0.4, p(healpulseId, "pulseRadius", action));
            const motes = Math.max(8, Math.round(p(healpulseId, "motes", action)));
            const reach = Math.max(4, p(healpulseId, "reach", action));
            const distance = Math.max(1, mate.position().minus(body.position()).length());
            // 出招一刻把总路程定下：步数保留原公式的 3..72 刻，总路程 = 步数 × 速度。
            const travelTicks = Math.max(3, Math.min(72, Math.round(distance / speed)));
            const budget = travelTicks * speed;
            const contact = radius + 0.05;
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.75));
            const density = Math.max(4, Math.round(motes / 3));
            const ref = String(target.ref());
            const scenes = WorldFeedback.actionScenes(healpulseScene);

            sound(action, "minecraft:block.amethyst_block.resonate");
            scenes.show(action, "emit", body.position(),
                { moment: "emit", motes: motes, radius: radius });

            let front = body.position();
            let previous = front;
            let heading = healpulseUnit(mate.position().minus(front));
            let travelled = 0;

            function fizzle(current: CombatAction, access: CombatWorld, at: CombatPoint): void {
                scenes.stop(current, "seek");
                WorldFeedback.emit(access, healpulseScene, 1, at, { moment: "fizzle", radius: radius, scale: scale }, 22);
                WorldFeedback.text(access, healpulseAbove(at), healpulseTextFizzle, [], 26);
                scenes.finish(current, done);
            }

            function arrive(current: CombatAction, access: CombatWorld, now: CombatActor, landed: CombatObservation): void {
                scenes.stop(current, "seek");
                const before = landed.health();
                healpulseHeal(access, now, fraction, "healpulse");
                const after = access.observe(now);
                const gained = after ? Math.max(0, after.health() - before) : 0;
                const share = landed.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / landed.maxHealth())) : 0;
                const at = after === null ? landed.position() : after.position();
                access.sound("minecraft:entity.experience_orb.pickup", at, 14, "{}");
                WorldFeedback.emit(access, healpulseScene, 1, at,
                    { moment: "wash", target: ref, radius: radius, scale: scale,
                        glow: Math.max(6, Math.round(motes * (0.4 + share))) }, 32);
                WorldFeedback.text(access, healpulseAbove(at), gained > 0 ? healpulseTextWash : healpulseTextFull, [Math.round(gained * 10) / 10], 30);
                scenes.finish(current, done);
            }

            function step(current: CombatAction): void {
                const access = current.world();
                const now = access.actor(ref);
                const landed = now === null ? null : access.observe(now);
                if (now === null || landed === null || !access.valid(now) || !access.friendly(now)) {
                    fizzle(current, access, front);
                    return;
                }
                // 真正贴上伙伴身体（含体型）的一刻才算到达；pulseRadius 参与这个接触判定。
                const closest = access.closestPoint(now, front);
                if (front.minus(closest).length() <= contact) { arrive(current, access, now, landed); return; }
                const centre = landed.position(), toTarget = centre.minus(front), span = toTarget.length();
                if (front.minus(centre).length() > reach + radius + 0.75) { fizzle(current, access, front); return; }
                heading = healpulseTurnToward(heading, healpulseUnit(toTarget), healpulseTurn);
                const stepDistance = Math.min(speed, span);
                if (!(stepDistance > 0.0001)) { arrive(current, access, now, landed); return; }
                const next = front.plus(heading.scale(stepDistance));
                const wall = WorldGeometry.blockHit(access, front, next);
                if (wall !== null) { fizzle(current, access, wall.position()); return; }
                previous = front;
                front = next;
                travelled = travelled + stepDistance;
                // 逐步扫过：每刻发当前真实的一小段（previous→front），判定与表现共用同一个波前。
                scenes.show(current, "seek", front, {
                    moment: "seek", target: ref, point: [front.x(), front.y(), front.z()],
                    direction: [heading.x(), heading.y(), heading.z()],
                    path: [[previous.x(), previous.y(), previous.z()], [front.x(), front.y(), front.z()]],
                    density: density, radius: radius, laneSize: scale * 0.18, sparkSize: scale * 0.06,
                    frontScale: scale * (0.7 + Math.min(1, travelled / budget) * 0.5)
                });
                if (travelled > budget + 0.05) { fizzle(current, access, front); return; }
                current.after(1, step);
            }
            step(action);
        }
    });
}
