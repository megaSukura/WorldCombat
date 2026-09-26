/**
 * 治愈波动 / Heal Pulse —— 执行组织。
 *
 * 核心念头：从自己身上推出一圈治愈的波动，它沿施法者到伙伴的连线赶路、化成一口生命；它是**赶路来的**——越远到得越晚，
 *   这一段路就是对手的余地。
 *
 * 出手：共享节奏。windup（提交前）只播预告——胸口先聚起一圈温光；准备可被打断，不花代价。
 * 送出（提交后）：波动离开施法者，朝伙伴**当前所在的位置**推进；飞行时间取自出招那一刻的距离 ÷ `pulseSpeed`。
 *   飞行期间每刻只用同一组数据更新波前（施法者到伙伴的连线方向、已经走过的比例、到达预计），
 *   画面读到的正是判定用的那条线与那个前沿；伙伴边走边被追，但总路程预算不再延长。
 * 结果：到达时重新取得伙伴——还活着、仍是友方、仍在 `reach` 之内就按 `heal` 回复并播放 wash（粒子数量随实际回复量）；
 *   超范围、离场或已不是友方的，这一口落空（fizzle，PP 与冷却照付）。波不作实体、不会被身体挡下。
 *
 * 反制：等待期就是余地——对手可以在波动抵达前把残血伙伴带走，或把它拉出射程让波落空。
 * 与同族分开：花疗是花瓣当场在伤者身上绽开；治愈波动是一圈**要赶一段路**的波，距离越远越慢，吃时机。
 */
namespace PokemonSkills {
    const healpulseScene = "world_combat:move_healpulse";
    const healpulseTextWash = "world_combat.move.healpulse.text.wash";
    const healpulseTextFull = "world_combat.move.healpulse.text.full";
    const healpulseTextFizzle = "world_combat.move.healpulse.text.fizzle";

    function healpulseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

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
        description: "从自己身上推出一圈治愈波动，沿瞄准线赶向选定的友方；抵达时回复其最大生命的一半左右。飞行时间取决于距离与波动速度，距离越远到得越晚；飞行期间波前会追向伙伴的当前位置，但对手把伙伴拉出射程或抢在抵达前打倒它，这一口就落空。",
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
            const travel = Math.max(3, Math.min(72, Math.round(distance / speed)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.75));
            const density = Math.max(4, Math.round(motes / 3));
            const ref = String(target.ref());
            const scenes = WorldFeedback.actionScenes(healpulseScene);

            sound(action, "minecraft:block.amethyst_block.resonate");
            scenes.show(action, "emit", body.position(),
                { moment: "emit", motes: motes, radius: radius });

            function fizzle(current: CombatAction, access: CombatWorld, at: CombatPoint): void {
                scenes.stop(current, "seek");
                WorldFeedback.emit(access, healpulseScene, 1, at, { moment: "fizzle", radius: radius, scale: scale }, 22);
                WorldFeedback.text(access, healpulseAbove(at), healpulseTextFizzle, [], 26);
                scenes.finish(current, done);
            }

            let elapsed = 0;
            function step(current: CombatAction): void {
                const access = current.world();
                const now = access.actor(ref);
                const landed = now === null ? null : access.observe(now);
                const caster = access.observe(self);
                if (now === null || landed === null || caster === null || !access.valid(now) || !access.friendly(now)) {
                    fizzle(current, access, current.origin());
                    return;
                }
                const from = caster.position(), to = landed.position(), delta = to.minus(from);
                const span = delta.length();
                if (span > reach + 0.75) { fizzle(current, access, to); return; }
                elapsed = elapsed + 1;
                if (elapsed >= travel) {
                    scenes.stop(current, "seek");
                    const before = landed.health();
                    healpulseHeal(access, now, fraction, "healpulse");
                    const after = access.observe(now);
                    const gained = after ? Math.max(0, after.health() - before) : 0;
                    const share = landed.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / landed.maxHealth())) : 0;
                    access.sound("minecraft:entity.experience_orb.pickup", landed.position(), 14, "{}");
                    WorldFeedback.emit(access, healpulseScene, 1, landed.position(),
                        { moment: "wash", target: ref, radius: radius, scale: scale,
                            glow: Math.max(6, Math.round(motes * (0.4 + share))) }, 32);
                    WorldFeedback.text(access, healpulseAbove(landed.position()), gained > 0 ? healpulseTextWash : healpulseTextFull, [Math.round(gained * 10) / 10], 30);
                    scenes.finish(current, done);
                    return;
                }
                const unit = span > 0.0001 ? WorldCombat.point(delta.x() / span, delta.y() / span, delta.z() / span) : WorldCombat.point(0, 1, 0);
                const progress = Math.max(0, Math.min(1, elapsed / travel));
                const front = from.plus(unit.scale(span * progress));
                scenes.show(current, "seek", front, {
                    moment: "seek", target: ref, point: [front.x(), front.y(), front.z()],
                    direction: [unit.x(), unit.y(), unit.z()],
                    path: [[from.x(), from.y(), from.z()], [front.x(), front.y(), front.z()]],
                    density: density, radius: radius, laneSize: scale * 0.18, sparkSize: scale * 0.06,
                    frontScale: scale * (0.7 + progress * 0.5)
                });
                current.after(1, step);
            }
            step(action);
        }
    });
}
