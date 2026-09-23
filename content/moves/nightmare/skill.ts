/**
 * 恶梦 / nightmare —— 执行组织。
 *
 * 核心念头：只对**已经睡熟**的人下手。几层黑影压下去，每隔一段从它身上抽走一口生命——固定比例，不看防御
 *   与相性；而且每一次抽取都会本能地把刚被疼痛唤醒的人**重新按回睡眠里**。它把一个人的睡眠变成一个
 *   持续失血的窗口，直到恶梦自己走完，或者有人把恶梦解掉／把施术者打倒赶走。
 *
 * 两幕：
 *   起（windup，提交前）：施法者掌心聚起一团黑影，只播预告。
 *   咒（windup → seal，提交后）：给睡者挂上本单元的载体 world_combat:nightmare（共享身份 world_combat:status/nightmare），
 *     把它的睡眠续到与恶梦同寿，并起一个绑定效果 world_combat:nightmare_bind（源为施法者、目标为睡者）。
 *   跳（pulse，随绑定效果调度）：每 interval 抽走一份最大生命；如果睡者被抽醒了，立刻把睡眠按回去；
 *     每一跳比上一跳轻（固定衰减 0.8）。恶梦走完或被清掉时，睡眠也到点，人醒过来。
 *
 * 反制：**清掉恶梦本身**是唯一的直接解（牛奶／清状态）；把施术者打倒、收回或逼离也会让绑定失效，恶梦随之散去。
 *   睡眠本身由共享规则承担——它一受伤害就断，所以恶梦才需要每一跳把睡者按回去。
 */
namespace PokemonSkills {
    function nightmareAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    // 恶梦绑定：源为施法者、目标为睡者，携带逐跳数值；每跳抽血并把睡者按回睡眠。
    WorldCombat.effect(nightmareBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "drain", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid nightmare bind: " + key);
        });
        if (value.interval < 1 || value.drain <= 0 || value.left < 0) throw new Error("Invalid nightmare bind");
        if (typeof value.caster !== "string") throw new Error("Invalid nightmare bind: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(nightmareBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        effect.schedule("hold", "hold", 10, "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 每 10 刻确认一次睡者仍被押着：无论中途是什么把它弄醒，恶梦都会把它按回去。
    WorldCombat.effectHandler(nightmareBind, "hold", function (effect) {
        const world = effect.world(), victim = effect.target();
        const dream = world.valid(victim) ? MobEffects.read(world, victim, nightmareEffect) : null;
        if (dream === null) { effect.end(); return; }
        if (!CombatStatus.has(world, victim, "sleep")) CombatStatus.inflict(world, victim, "sleep", Math.max(20, dream.duration()));
        effect.schedule("hold", "hold", 10, "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target();
        const data = JSON.parse(effect.state());
        const dream = world.valid(victim) ? MobEffects.read(world, victim, nightmareEffect) : null;
        if (dream === null || !world.valid(effect.source())) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * Math.max(0.05, data.drain)));
        const loss = -world.health(victim, -amount, "world_combat:nightmare");
        if (loss > 0) {
            const shades = Math.max(4, Math.round(data.shades || 10));
            WorldFeedback.emit(world, nightmareScene, 1, body.position(),
                { moment: "pulse", target: String(victim.ref()), drain: Math.round(data.drain * 1000) / 1000,
                  loss: Math.round(loss * 10) / 10, shades: shades, left: data.left }, 26);
            WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.drain", [Math.round(loss * 10) / 10], 24);
            world.sound("minecraft:particle.soul_escape", body.position(), 12, "{}");
        }
        // 被抽醒的人立刻被按回睡眠：睡眠与恶梦同寿。
        if (world.valid(victim) && !CombatStatus.has(world, victim, "sleep"))
            CombatStatus.inflict(world, victim, "sleep", Math.max(20, dream.duration()));
        data.drain = data.drain * nightmareDecay;
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });

    // 每一跳抽血都会触发共享规则「受伤即醒」；这一条排在那之后，把被抽醒的人立刻按回睡眠，
    // 让睡眠的缺口只存在于同一 tick 内（玩家读不到）。恶梦散去或已被清掉时不动。
    WorldCombat.on("world_combat:move_nightmare/hold", "world_combat:damage_applied", "world_combat:status/applied", function (event) {
        const world = event.world(), victim = event.target();
        if (victim === null || !world.valid(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (String(data.cause) !== "world_combat:nightmare" || !(data.actual > 0)) return;
        const dream = MobEffects.read(world, victim, nightmareEffect);
        if (dream === null || CombatStatus.has(world, victim, "sleep")) return;
        CombatStatus.inflict(world, victim, "sleep", Math.max(20, dream.duration()));
    });

    // 恶梦散去（自然到期或被人解掉）：收回绑定；自然走完再播一次退场。
    WorldCombat.on("world_combat:move_nightmare/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightmareEffect) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const binds = world.effects(victim, nightmareBind);
        for (let i = 0; i < binds.length; i++) world.operation(binds[i].id(), "world_combat:dispel", "{}");
        if (String(data.cause) !== "expired") return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, nightmareScene, 1, body.position(), { moment: "wake", target: String(victim.ref()) }, 24);
        WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.wake", [], 24);
    });

    define({
        id: nightmareId,
        cooldownParameter: "recharge",
        name: "恶梦",
        description: "让已经睡着的对手做起恶梦：每隔一段从它身上抽走一份最大生命，并把它按在睡眠里醒不过来。只对睡着的目标生效；想救人只能清掉恶梦，或把施术者打倒、逼走。",
        uses: ["收割自己或队友制造的睡眠窗口", "在睡者身上压出持续失血", "逼对手花资源解掉恶梦或来保护睡者"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 12,
        active: 1,
        recover: 10,
        cooldown: 90,
        style: "nightmare",
        defaults: { deep: false },
        fields: [
            field(pathOf("deep"), "深梦", "boolean", {
                help: "开启：每跳抽取 ×1.15、间隔更紧（总时长 ×0.8、跳数更少）、起手 +2 刻、冷却 +6 刻，用来快速收割；关闭（长梦）：每跳 ×0.85，但总时长 ×1.25、跳数更多，用来慢慢磨。"
            })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[nightmareId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(nightmareId, "tempo", context)),
                recover: Math.round(p(nightmareId, "aftercast", context)),
                cooldown: Math.round(p(nightmareId, "recharge", context)),
                active: 1,
                range: p(nightmareId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (!CombatStatus.behaves(world, target, "sleep")) return "not-asleep";
            if (CombatStatus.has(world, target, "nightmare")) return "already-nightmared";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            action.present("nightmare:windup:" + action.id(), nightmareScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[nightmareId], detail: { values: config } };
            return { radius: pokemon ? p(nightmareId, "reach", context) : 8, geometry: "line", style: "nightmare", color: 0x4B2A6B,
                label: config && config.deep === true ? "恶梦·深梦" : "恶梦·长梦" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || !CombatStatus.behaves(world, target, "sleep")) {
                WorldFeedback.emit(world, nightmareScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const origin = action.origin();
            const nightTicks = Math.max(40, Math.round(p(nightmareId, "nightTicks", action)));
            const drain = Math.max(0.05, p(nightmareId, "drain", action));
            const interval = Math.max(10, Math.round(p(nightmareId, "interval", action)));
            const shades = Math.max(4, Math.round(p(nightmareId, "shades", action)));
            const radius = Math.max(0.2, p(nightmareId, "sealRadius", action));
            const ref = String(target.ref());
            const left = Math.max(1, Math.floor(nightTicks / interval));
            const span = at.minus(origin).length();
            const flow = span < 0.05 ? WorldCombat.point(0, 1, 0) : at.minus(origin).unit();
            sound(action, "minecraft:entity.evoker.prepare_attack");
            WorldFeedback.emit(world, nightmareScene, 1, origin,
                { moment: "seal", path: [String(action.actor().ref()), ref], target: ref,
                    direction: [flow.x(), flow.y(), flow.z()], span: span, shades: shades, drain: Math.round(drain * 1000) / 1000,
                    scale: Math.max(0.6, Math.min(1.8, radius / 0.5)) }, 28);
            if (MobEffects.apply(world, target, nightmareEffect, nightTicks, 0) === null) {
                WorldFeedback.emit(world, nightmareScene, 1, at, { moment: "immune", target: ref }, 20);
                WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.immune", [], 24);
                done(action);
                return;
            }
            // 睡眠与恶梦同寿：把睡者按到恶梦结束。
            CombatStatus.inflict(world, target, "sleep", nightTicks);
            const existing = world.effects(target, nightmareBind);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(nightmareBind, target,
                JSON.stringify({ interval: interval, drain: drain, left: left, shades: shades, caster: String(action.actor().ref()) }), nightTicks + 10);
            WorldFeedback.emit(world, nightmareScene, 1, at,
                { moment: "curse", target: ref, shades: shades, drain: Math.round(drain * 1000) / 1000, left: left }, 28);
            WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.curse", [left], 28);
            sound(action, "minecraft:entity.evoker.cast_spell");
            done(action);
        }
    });
}
