/**
 * 金属音 / metalsound — 执行组织。
 *
 * 核心念头：用身上的金属相互摩擦，慢慢刮出一声让人牙酸的高频音。声音贴着墙也能送到对手耳里，
 *   在它体内拉出一条长长的回响，特防被一次一次刮掉。它不飞、不铺地，也不需要看见对方——但要把音磨出来，
 *   施法者得先站定，这是本组起手最久、回响最久的一招。
 *
 * 出手：长起手（windup 在身上刮出金属火花与一圈圈声纹）后提交；起手可被打断，打断不花代价。
 *   自由瞄准（kind: aim）：可指向一个敌人，也可指向一个世界点（含 AI 记忆点）——声音送过去，取该点附近最近的
 *   非友方；掩体挡不住它，但距离拉到 reach 之外就听不见。
 * 命中：把预算拆成最多三次、间隔 gap 刻的刮擦，每次只降一级特防。降级不是永久写级，而是**绑在这一份回响载体上的
 *   临时 boostWindow**：每刮一次累加一级，回响期间持续生效；载体被驱散、刷新或自然到期时，这些临时降级一并收回。
 *   首个成功段挂共享身份 world_combat:status/grating（本单元效果 world_combat:metal_sound_grating，只借身份），
 *   持续回响画面由一次属于本次施放的托管效果绑在真实载体上，载体一收画面同刻收束。
 * 反制：拉开到回响距离之外就听不见；刮擦要站定，移动超过小容差即打断剩余刮擦；它不造成伤害，站定磨音的时间正是对手冲上来的窗口。
 */
namespace PokemonSkills {
    const metalsoundVisualEffect = "world_combat:metalsound_grating_visual";

    function metalsoundAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 瞄向一个世界点时取该点附近最近的、射程内的非友方；声音不要求通视。 */
    function metalsoundNearest(world: CombatWorld, point: CombatPoint, self: CombatActor, reach: number): CombatActor | null {
        const around = world.query(point, Math.max(1, reach), false);
        let best: CombatActor | null = null, bestGap = Infinity;
        for (let i = 0; i < around.length; i++) {
            const other = around[i];
            if (String(other.ref()) === String(self.ref())) continue;
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null) continue;
            const gap = facts.position().minus(point).length();
            if (gap < bestGap) { bestGap = gap; best = other; }
        }
        return best;
    }

    /** 回响画面绑在这次施放自己的托管效果上：载体被清除/刷新时，托管效果结束，画面同刻收回。 */
    function metalsoundLingerVisual(effect: CombatEffect, cycles: number): void {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "metalsound:linger:" + String(target.ref()), metalsoundScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), cycles: cycles });
    }

    WorldCombat.effect(metalsoundVisualEffect, 1, 500, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.cycles !== "number" || !isFinite(value.cycles)) throw new Error("Invalid metalsound linger state");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    WorldCombat.effectHandler(metalsoundVisualEffect, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, metalsoundEffect);
        if (carrier === null) { effect.end(); return; }
        data.anchor = MobEffects.anchor(carrier);
        effect.state(JSON.stringify(data));
        metalsoundLingerVisual(effect, data.cycles);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(metalsoundVisualEffect, "hold", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, metalsoundEffect);
        // 载体被驱散、被替换（新 revision）或提前清除：这次施放的画面收束，不再跟着一个失效锚。
        if (carrier === null || !data.anchor || String(carrier.key()) !== String(data.anchor.key)) { effect.end(); return; }
        effect.remaining(carrier.duration() < 0 ? 500 : Math.max(1, Math.min(500, carrier.duration())));
        metalsoundLingerVisual(effect, data.cycles);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(metalsoundVisualEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: metalsoundId,
        cooldownParameter: "wait",
        name: "金属音",
        description: "摩擦身上的金属，发出让人牙酸的高频声，隔着掩体也能送到对手耳里，分几次一次一级地刮掉它的特防。要把音磨出来就得先站定，起手很长；每刮过一次会重新核对目标还在射程内、自己还在原地；长磨多刮一级、回响更久，但更慢。回响结束或被打断时，未刮完的降级一并收回。",
        uses: ["隔着掩体一级一级磨掉一个特防位", "在队友承伤、目标走不动时把特防刮到底", "在墙后安全起手，再把声音送到对面"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 15,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "metal",
        defaults: { long: false },
        fields: [
            flag("long", "长磨")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[metalsoundId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(metalsoundId, "tempo", context)),
                recover: p(metalsoundId, "recover", context),
                cooldown: Math.round(p(metalsoundId, "wait", context)),
                active: 1,
                range: p(metalsoundId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("metalsound-windup", metalsoundScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", long: config && config.long ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[metalsoundId], detail: { values: config } };
            return { radius: p(metalsoundId, "reach", context), geometry: "line", style: "metal", color: 0xC9B04C,
                label: config && config.long ? "金属音·长磨" : "金属音·短刮" };
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(metalsoundScene);
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const total = Math.max(1, Math.min(3, Math.round(p(metalsoundId, "drop", action))));
            const ring = Math.max(80, Math.round(p(metalsoundId, "ring", action)));
            const cycles = Math.max(6, Math.round(p(metalsoundId, "cycles", action)));
            const gap = Math.max(4, Math.round(p(metalsoundId, "gap", action)));
            const reach = Math.max(2, p(metalsoundId, "reach", action));
            const long = !!(config && config.long);
            const tolerance = Math.max(0.4, selfBody === null ? 0.4 : selfBody.width() * 0.6);
            sound(action, "minecraft:block.amethyst_block.resonate");
            // 自由 aim：实体输入直接用；世界点／AI 记忆点取该点附近最近的非友方。
            let target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target))
                target = metalsoundNearest(world, action.targetPosition(), self, reach);
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, metalsoundScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const ref = String(target.ref());
            const chosen: CombatActor = target;
            let applied = 0;
            let carrier: CombatMobEffect | null = null;
            let standPoint: CombatPoint | null = null;

            /** 收束：停掉连接纹与回响画面，交回动作。 */
            function settle(current: CombatAction): void {
                scenes.stop(current, "grate");
                scenes.finish(current, done);
            }

            /** 目标离开射程、离场或被换掉：剩下的刮擦不再发生，已实现的临时降级随载体保留到到期。 */
            function breakOff(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, metalsoundScene, 1, point,
                    { moment: "snap", target: ref, applied: applied, total: total, sparks: Math.round(10 + applied * 6) }, 22);
                WorldFeedback.text(scope, metalsoundAbove(point), "world_combat.move.metalsound.text.break", [], 26);
                settle(current);
            }

            /** 施法者离开原点：站定承诺被打破，剩余刮擦中止。 */
            function standBreak(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, metalsoundScene, 1, point,
                    { moment: "snap", target: ref, applied: applied, total: total, sparks: Math.round(10 + applied * 6) }, 22);
                WorldFeedback.text(scope, metalsoundAbove(point), "world_combat.move.metalsound.text.broken", [], 26);
                settle(current);
            }

            /** 一次刮擦：重新核对目标在射程内、自己在原地，把一级特防累加为绑定载体的临时窗口。 */
            function scrape(current: CombatAction, remaining: number): void {
                const scope = current.world();
                current.stopMovement();
                const currentTarget = chosen;
                if (!scope.valid(currentTarget) || scope.friendly(currentTarget)) { settle(current); return; }
                const body = scope.observe(currentTarget);
                if (body === null) { settle(current); return; }
                const point = body.position();
                // 声音不需要通视：掩体挡不住金属音，但距离拉到 reach 之外就听不见。
                if (point.minus(origin).length() > reach) { breakOff(current, point); return; }
                const me = scope.observe(self);
                if (me === null) { settle(current); return; }
                // 站定承诺：第一次刮擦定住声源位置，之后移动超过小容差即中止剩余刮擦。
                if (standPoint === null) standPoint = me.position();
                else if (me.position().minus(standPoint).length() > tolerance) { standBreak(current, point); return; }
                // 首个成功段才挂身份载体；之后每次核对还是同一份载体，被拒绝或换锚就停止。
                if (carrier === null) {
                    carrier = MobEffects.apply(scope, currentTarget, metalsoundEffect, ring, 0);
                    if (carrier === null) { settle(current); return; }
                    scope.effect(metalsoundVisualEffect, currentTarget, JSON.stringify({ cycles: cycles }), ring);
                } else {
                    const currentCarrier = MobEffects.read(scope, currentTarget, metalsoundEffect);
                    if (currentCarrier === null || String(currentCarrier.key()) !== String(carrier.key())) { settle(current); return; }
                }
                // 降级由 boostWindow 拥有并绑在这份载体上：每刮一次累加一级，只按实际级差计数。
                const before = NativeEffects.effectiveStage(scope, currentTarget, "spd");
                NativeEffects.boostWindow(scope, currentTarget, { spd: -1 }, Math.max(1, carrier.duration()), "world_combat:move/metalsound", carrier);
                const dropped = Math.max(0, before - NativeEffects.effectiveStage(scope, currentTarget, "spd"));
                applied += dropped;
                sound(current, "minecraft:block.amethyst_block.resonate");
                scenes.show(current, "grate", origin,
                    { moment: "grate", path: ["source", "target"], target: ref, cycles: cycles, long: long ? 1 : 0,
                        applied: applied, total: total, remaining: remaining });
                WorldFeedback.emit(scope, metalsoundScene, 1, point,
                    { moment: "scrape", target: ref, cycles: cycles, applied: applied, total: total,
                        sparks: Math.round(8 + applied * 5) }, 22);
                WorldFeedback.text(scope, metalsoundAbove(point), "world_combat.move.metalsound.text.grate", [applied], 26);
                if (remaining <= 1) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { scrape(next, remaining - 1); });
            }

            // 连接纹从第一次刮擦起就持续存在，每段更新一次；完成或被拉开时 stop 收束。
            scenes.show(action, "grate", origin,
                { moment: "grate", path: ["source", "target"], target: ref, cycles: cycles, long: long ? 1 : 0,
                    applied: 0, total: total, remaining: total });
            scrape(action, total);
        }
    });
}
