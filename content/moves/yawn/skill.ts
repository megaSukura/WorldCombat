/**
 * 哈欠 / yawn —— 执行组织。
 *
 * 核心念头：当着对手的面张大口打一个哈欠，一串睡泡沿通视直线飘过去、贴在它头上倒数几秒。这招**必中**，
 *   但睡意是慢慢上来的——目标有一段窗口可以解掉它，或被别的状态占住，哈欠就压不下去。代价全在「等」。
 *
 * 两幕：
 *   起（windup，提交前）：嘴边的圈张开、睡泡攒起，只播预告。
 *   飘（puff → drowsy / sleep / fizzle / immune，提交后）：睡泡沿「自身→目标」的直线飘过去，给目标挂上
 *     本单元的睡意载体 world_combat:yawn_drowsy（共享身份 world_combat:status/yawn，只借身份）；同时起一个
 *     绑定效果 world_combat:yawn_doze 跟着目标，每 10 刻续一次头顶的倒数环（画面读得出还剩多少）。
 *   落（sleep / fizzle）：睡意自然走完时，用 mob_effect_removed 的 cause 区分「走完」还是「被解」——走完且
 *     目标身上没有别的状态，就转入共享睡眠 world_combat:status/sleep；被解掉或已被别的状态占住就作废。
 *
 * 反制：在窗口里解掉睡意（牛奶／清状态），或先让它中上任何一个主异常——哈欠就落不下来；睡着的目标一受伤害就醒。
 */
namespace PokemonSkills {
    function yawnAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    // 睡意倒数：跟着目标的绑定效果，携带转入睡眠所需的数值，每 10 刻续一次头顶的倒数环。
    WorldCombat.effect(yawnDoze, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["sleep", "puffs", "drowsy"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 1) throw new Error("Invalid yawn doze: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(yawnDoze, "start", function (effect) { effect.schedule("tick", "tick", 1, "{}"); });
    WorldCombat.effectHandler(yawnDoze, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(yawnDoze, "tick", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const drowsy = MobEffects.read(world, actor, yawnEffect);
        if (drowsy === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const remain = Math.max(0, drowsy.duration());
        const ratio = data.drowsy > 0 ? Math.max(0, Math.min(1, remain / data.drowsy)) : 0;
        WorldFeedback.keep(world, "yawn:" + String(actor.ref()), yawnScene, 1, body.position(),
            { moment: "drowsy", target: String(actor.ref()), remain: remain, drowsy: data.drowsy, puffs: data.puffs,
              ringRadius: Math.round((0.25 + 0.7 * ratio) * 100) / 100 }, 24);
        effect.schedule("tick", "tick", 10, "{}");
    });

    // 睡意走完（expired）就转入睡眠；被解掉（removed）或被别的状态占住就作废。
    WorldCombat.on("world_combat:move_yawn/doze", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== yawnEffect) return;
        const world = event.world(), actor = event.actor();
        const binds = world.valid(actor) ? world.effects(actor, yawnDoze) : [];
        const bind = binds.length ? binds[0] : null;
        function drop(): void { if (bind !== null) world.operation(bind.id(), "world_combat:dispel", "{}"); }
        if (String(data.cause) !== "expired") { drop(); return; }
        if (bind === null || !world.valid(actor)) return;
        const state = JSON.parse(bind.data());
        const body = world.observe(actor);
        if (body === null) { drop(); return; }
        const ref = String(actor.ref());
        if (CombatStatus.major(world, actor) !== "") {
            WorldFeedback.emit(world, yawnScene, 1, body.position(), { moment: "fizzle", target: ref }, 20);
            drop();
            return;
        }
        if (!CombatStatus.inflict(world, actor, "sleep", state.sleep)) {
            WorldFeedback.emit(world, yawnScene, 1, body.position(), { moment: "immune", target: ref }, 20);
            drop();
            return;
        }
        WorldFeedback.emit(world, yawnScene, 1, body.position(),
            { moment: "sleep", target: ref, puffs: state.puffs, ticks: Math.round(state.sleep / 20) }, 30);
        WorldFeedback.text(world, yawnAbove(body.position()), "world_combat.move.yawn.text.sleep", [Math.round(state.sleep / 20)], 30);
        world.sound("cobblemon:move.sleeppowder.target", body.position(), 14, "{}");
        drop();
    });

    define({
        id: yawnId,
        cooldownParameter: "recharge",
        name: "哈欠",
        description: "当面打一个必中的大哈欠，把睡意挂在目标身上；它必中，但要等几秒才睡着。目标能在这段窗口里解掉睡意，或被别的状态占住，哈欠就压不下去。",
        uses: ["在一个目标身上预埋睡眠，几秒后再动手", "逼对手花资源解状态或抢先中别的异常", "配合队友的食梦或恶梦"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 64,
        style: "yawn",
        defaults: { long: false },
        fields: [
            field(pathOf("long"), "长哈欠", "boolean", {
                help: "开启：睡意窗口 ×1.35、睡眠 ×1.2、射程 ×1.15，但给了目标更多挣脱的时间、冷却 ×1.1；关闭（短哈欠）：窗口 ×0.7、出手快、冷却短，但睡眠 ×0.85——快速按下去、睡得不深。"
            })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[yawnId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(yawnId, "tempo", context)),
                recover: Math.round(p(yawnId, "aftercast", context)),
                cooldown: Math.round(p(yawnId, "recharge", context)),
                active: 1,
                range: p(yawnId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, "sleep")) return "already-asleep";
            if (CombatStatus.major(world, target) !== "") return "already-affected";
            if (CombatStatus.has(world, target, "yawn")) return "already-drowsy";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("yawn:windup:" + action.id(), yawnScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", long: config && config.long === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[yawnId], detail: { values: config } };
            return { radius: pokemon ? p(yawnId, "reach", context) : 6, geometry: "line", style: "yawn", color: 0xD9C24A,
                label: config && config.long === true ? "哈欠·长" : "哈欠·短" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, yawnScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const origin = action.origin();
            const drowsyTicks = Math.max(30, Math.round(p(yawnId, "drowsyTicks", action)));
            const sleepTicks = Math.max(60, Math.round(p(yawnId, "sleepTicks", action)));
            const puffs = Math.max(4, Math.round(p(yawnId, "puffs", action)));
            const mouth = Math.max(0.2, p(yawnId, "mouthRadius", action));
            const span = at.minus(origin).length();
            const flow = span < 0.05 ? WorldCombat.point(0, 1, 0) : at.minus(origin).unit();
            const ref = String(target.ref());
            sound(action, "cobblemon:move.sleeppowder.actor");
            WorldFeedback.emit(world, yawnScene, 1, origin,
                { moment: "puff", path: [String(action.actor().ref()), ref], target: ref,
                    direction: [flow.x(), flow.y(), flow.z()], span: span, puffs: puffs,
                    scale: Math.max(0.6, Math.min(1.8, mouth / 0.5)) }, 24);
            if (MobEffects.apply(world, target, yawnEffect, drowsyTicks, 0) === null) {
                WorldFeedback.emit(world, yawnScene, 1, at, { moment: "immune", target: ref }, 20);
                WorldFeedback.text(world, yawnAbove(at), "world_combat.move.yawn.text.immune", [], 24);
                done(action);
                return;
            }
            const existing = world.effects(target, yawnDoze);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(yawnDoze, target, JSON.stringify({ sleep: sleepTicks, puffs: puffs, drowsy: drowsyTicks }), drowsyTicks + 10);
            WorldFeedback.emit(world, yawnScene, 1, at,
                { moment: "drowsy", target: ref, puffs: puffs, drowsy: drowsyTicks, remain: drowsyTicks, ringRadius: 0.95 }, 26);
            WorldFeedback.text(world, yawnAbove(at), "world_combat.move.yawn.text.drowsy", [Math.round(drowsyTicks / 20)], 26);
            done(action);
        }
    });
}
