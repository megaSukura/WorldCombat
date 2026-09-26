/**
 * 恶梦 / nightmare —— 执行组织。
 *
 * 核心念头：只对**已经睡熟**的人下手。几层黑影压下去，隔一段从它身上抽走一口生命——固定比例，不看防御
 *   与相性；这一口抽下去，疼痛会把人从睡眠里拽醒，而恶梦正随那一下醒来散去。它借别人的睡眠窗口打一记
 *   惩戒，不再把人按在睡眠里；想让恶梦多抽几口，得靠队友在你抽完之后继续补睡。
 *
 * 两幕：
 *   起（windup，提交前）：施法者掌心聚起一团黑影，只播预告。
 *   咒（seal → curse，提交后）：给睡者挂上本单元的载体 world_combat:nightmare（共享身份 world_combat:status/nightmare），
 *     并起一个绑定效果 world_combat:nightmare_bind（源为施法者、目标为睡者）。
 *   跳（pulse）：只要自然仍有有效睡眠、施术者还在射程内，就每 interval 抽走一份最大生命；伤害会触发共享的
 *     「受伤即醒」，睡者醒来的一刻恶梦立刻收场，一层层黑影随之被切断。每一跳比上一跳轻（固定衰减 0.8）。
 *
 * 反制：清掉恶梦本身（牛奶／清状态）、把施术者打倒或逼离射程、或让睡者被任意伤害打醒，恶梦都会散。
 *   睡眠不再由恶梦续上——醒来就脱离折磨。Boss 若免疫睡眠便始终不满足「已睡」的前置，无法被下咒。
 */
namespace PokemonSkills {
    function nightmareAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    // 恶梦绑定：源为施法者、目标为睡者，携带逐跳数值。它只在睡者仍睡着、施术者仍在射程内时抽血。
    WorldCombat.effect(nightmareBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "drain", "left", "reach"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid nightmare bind: " + key);
        });
        if (value.interval < 1 || value.drain <= 0 || value.left < 0 || value.reach <= 0) throw new Error("Invalid nightmare bind");
        if (typeof value.caster !== "string") throw new Error("Invalid nightmare bind: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(nightmareBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("watch", "watch", 10, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 每 10 刻确认一次：睡者还在、恶梦印记还在、施术者还在。睡者被任意方式弄醒，恶梦立刻收场。
    WorldCombat.effectHandler(nightmareBind, "watch", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        if (MobEffects.read(world, victim, nightmareEffect) === null) { effect.end(); return; }
        if (!CombatStatus.behaves(world, victim, "sleep")) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        if (!world.valid(effect.source())) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        effect.schedule("watch", "watch", 10, "{}");
    });
    WorldCombat.effectHandler(nightmareBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target();
        const data = JSON.parse(effect.state());
        const dream = world.valid(victim) ? MobEffects.read(world, victim, nightmareEffect) : null;
        if (dream === null) { effect.end(); return; }
        if (!CombatStatus.behaves(world, victim, "sleep")) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        if (!world.valid(effect.source())) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        const body = world.observe(victim), source = world.observe(effect.source());
        if (body === null || source === null) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        // 施术者离得太远时这一跳抽不到血；印记按原节奏继续走，直到走完或睡者醒来。
        if (body.position().minus(source.position()).length() > data.reach + 0.5) {
            data.left = data.left - 1;
            effect.state(JSON.stringify(data));
            if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
            else { CombatStatus.cure(world, victim, "nightmare"); effect.end(); }
            return;
        }
        const amount = Math.max(1, Math.floor(body.maxHealth() * Math.max(0.05, data.drain)));
        const loss = -world.health(victim, -amount, "world_combat:nightmare");
        if (loss > 0) {
            const shades = Math.max(4, Math.round(data.shades || 10));
            // intensity 由本跳实际扣血占最大生命的比例换算，直接缩放 pulse 各发射器的密度与亮度。
            const intensity = Math.max(0.5, Math.min(2.2, loss / Math.max(1, body.maxHealth() * 0.12)));
            WorldFeedback.emit(world, nightmareScene, 1, body.position(),
                { moment: "pulse", target: String(victim.ref()), shades: shades, intensity: Math.round(intensity * 100) / 100 }, 26);
            WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.drain", [Math.round(loss * 10) / 10], 24);
            world.sound("minecraft:particle.soul_escape", body.position(), 12, "{}");
        }
        data.drain = data.drain * nightmareDecay;
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        // 这一抽本身就是伤害：共享的「受伤即醒」把人弄醒，恶梦随醒来结束，不再把人按回去。
        if (!CombatStatus.behaves(world, victim, "sleep")) { CombatStatus.cure(world, victim, "nightmare"); effect.end(); return; }
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else { CombatStatus.cure(world, victim, "nightmare"); effect.end(); }
    });
    // 恶梦收场：此刻还睡着＝印记消散（fade）；已经被弄醒＝醒来切断全部黑影（wake）。
    WorldCombat.effectHandler(nightmareBind, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        if (CombatStatus.behaves(world, victim, "sleep")) {
            WorldFeedback.emit(world, nightmareScene, 1, body.position(), { moment: "fade", target: String(victim.ref()) }, 24);
        } else {
            WorldFeedback.emit(world, nightmareScene, 1, body.position(), { moment: "wake", target: String(victim.ref()) }, 24);
            WorldFeedback.text(world, nightmareAbove(body.position()), "world_combat.move.nightmare.text.wake", [], 24);
        }
    });

    // 恶梦印记被外部清掉（牛奶／清状态）时收回绑定；绑定自己的 end 负责退场表现。
    WorldCombat.on("world_combat:move_nightmare/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightmareEffect) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const binds = world.effects(victim, nightmareBind);
        for (let i = 0; i < binds.length; i++) world.operation(binds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: nightmareId,
        cooldownParameter: "recharge",
        name: "恶梦",
        description: "趁对手睡熟给它压上恶梦：隔一段抽走一份最大生命，这一抽的疼痛会把它弄醒，恶梦也随醒来散去。只对睡着的目标生效，伤害按最大生命比例结算、不经过防御与相性；想让恶梦多抽几口，得靠队友在抽取之后继续补睡。Boss 免疫睡眠便无法被下咒。",
        uses: ["收割自己或队友制造的睡眠窗口", "在睡者身上打出一记不看防御的重击", "逼对手花资源解掉恶梦或来保护睡者"],
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
            const reach = Math.max(1, p(nightmareId, "reach", action));
            const ref = String(target.ref());
            const left = Math.max(1, Math.floor(nightTicks / interval));
            sound(action, "minecraft:entity.evoker.prepare_attack");
            // seal 是一条连接施术者与睡者的真实影线（非沿线飞行）；curse 的梦印半径随 sealRadius 放大。
            WorldFeedback.emit(world, nightmareScene, 1, origin,
                { moment: "seal", path: [String(action.actor().ref()), ref], target: ref,
                    shades: shades, scale: Math.max(0.6, Math.min(1.8, radius / 0.5)) }, 28);
            if (MobEffects.apply(world, target, nightmareEffect, nightTicks, 0) === null) {
                WorldFeedback.emit(world, nightmareScene, 1, at, { moment: "immune", target: ref }, 20);
                WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.immune", [], 24);
                done(action);
                return;
            }
            const existing = world.effects(target, nightmareBind);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(nightmareBind, target,
                JSON.stringify({ interval: interval, drain: drain, left: left, shades: shades, caster: String(action.actor().ref()), reach: reach }), nightTicks + 10);
            WorldFeedback.emit(world, nightmareScene, 1, at, { moment: "curse", target: ref, shades: shades }, 28);
            WorldFeedback.text(world, nightmareAbove(at), "world_combat.move.nightmare.text.curse", [left], 28);
            sound(action, "minecraft:entity.evoker.cast_spell");
            done(action);
        }
    });
}
