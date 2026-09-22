/**
 * 催眠术 / hypnosis —— 执行组织。
 *
 * 核心念头：盯住对手，把一圈圈暗示光环沿一条通视的直线送进它脑里。它隔空、瞬发，但最不牢靠——
 *   能否成立是一场意志对抗；压过去就当场睡下，压不过就散在对方身上。走位与通视是它的读法。
 *
 * 两幕：
 *   起（windup，提交前）：眼眶亮起、光环在头侧攒起，只播预告。
 *   送（wave → sleep / resist / immune，提交后）：光环沿「自身→目标」的直线滚过去；命中判定是一次
 *     成功率掷骰，成功则挂共享身份 world_combat:status/sleep（宝可梦那一层同步成原生睡眠），失败则
 *     光环散开、只留下一点困意的残影。目标已有的状态不参与判定——它不要求对方干净。
 *
 * 睡着的余韵：提交后另起一个绑定效果 world_combat:hypnosis_trance 跟着目标，每 20 刻续一次头顶的 Z 与
 *   一圈收拢的剩余环；睡眠被伤害打醒或被打断时它自己收场。这样玩家能读出「还剩多少」。
 *
 * 反制：切断视线、拉开到射程外、用更高特防与等级硬扛；睡眠本身一受伤害就解除。
 */
namespace PokemonSkills {
    function hypnosisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    // 睡意余韵：跟着睡者的绑定效果，每 20 刻续一次头顶的环与 Z，睡眠不在就收场。
    WorldCombat.effect(hypnosisTrance, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.total !== "number" || !isFinite(value.total) || value.total < 1) throw new Error("Invalid hypnosis trance: total");
        if (typeof value.rings !== "number" || !isFinite(value.rings)) throw new Error("Invalid hypnosis trance: rings");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(hypnosisTrance, "start", function (effect) { effect.schedule("tick", "tick", 1, "{}"); });
    WorldCombat.effectHandler(hypnosisTrance, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(hypnosisTrance, "tick", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, "sleep")) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const remain = Math.max(0, effect.remaining());
        const ratio = data.total > 0 ? Math.max(0, Math.min(1, remain / data.total)) : 0;
        WorldFeedback.keep(world, "hypnosis:" + String(actor.ref()), hypnosisScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), remain: remain, total: data.total, rings: data.rings,
              ringRadius: Math.round((0.2 + 0.75 * ratio) * 100) / 100 }, 30);
        effect.schedule("tick", "tick", 20, "{}");
    });

    define({
        id: hypnosisId,
        name: "催眠术",
        description: "施以诱导睡意的暗示，沿一条通视的直线把目标带进睡眠。它隔空、瞬发，但成败取决于双方意志——特攻与等级压不过对方的特防与等级就可能散开；睡着的目标会一直闭着眼，直到受伤惊醒。",
        uses: ["在交战开始前先放倒一个远处的威胁", "为队友的食梦或恶梦制造睡眠窗口", "逼对手绕开视线或拉开距离"],
        kind: "enemy",
        range: 8,
        maxRange: 16,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 60,
        style: "hypno",
        defaults: { focus: false },
        fields: [
            field(pathOf("focus"), "凝神", "boolean", {
                help: "开启：成功率 ×1.25、睡眠 ×1.2，但射程 ×0.85、起手 +3 刻、冷却 ×1.15，用来稳稳压住一个目标；关闭（随惑）：射程 ×1.2、出手快、冷却短，但成功率 ×0.8、睡眠 ×0.8，用更快的节奏反复试。"
            })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hypnosisId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(hypnosisId, "tempo", context)),
                recover: p(hypnosisId, "aftercast", context),
                cooldown: Math.round(p(hypnosisId, "recharge", context)),
                active: 1,
                range: p(hypnosisId, "reach", context)
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
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("hypnosis:windup:" + action.id(), hypnosisScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[hypnosisId], detail: { values: config } };
            return { radius: pokemon ? p(hypnosisId, "reach", context) : 8, geometry: "line", style: "hypno", color: 0x7D5BD8,
                label: config && config.focus === true ? "催眠术·凝神" : "催眠术·随惑" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, hypnosisScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const origin = action.origin();
            const rings = Math.max(4, Math.round(p(hypnosisId, "rings", action)));
            const radius = Math.max(0.18, p(hypnosisId, "gazeRadius", action));
            const speed = Math.max(0.4, p(hypnosisId, "waveSpeed", action));
            const chance = Math.max(0.05, Math.min(0.95, p(hypnosisId, "landChance", action)));
            const span = at.minus(origin).length();
            const flow = span < 0.05 ? WorldCombat.point(0, 1, 0) : at.minus(origin).unit();
            const ref = String(target.ref());
            sound(action, "cobblemon:move.sing.actor");
            WorldFeedback.emit(world, hypnosisScene, 1, origin,
                { moment: "wave", path: [String(action.actor().ref()), ref], target: ref,
                    direction: [flow.x(), flow.y(), flow.z()], span: span, rings: rings, speed: speed,
                    scale: Math.max(0.6, Math.min(1.8, radius / 0.42)) }, 26);
            if (world.random() >= chance) {
                WorldFeedback.emit(world, hypnosisScene, 1, at, { moment: "resist", target: ref, rings: rings }, 22);
                WorldFeedback.text(world, hypnosisAbove(at), "world_combat.move.hypnosis.text.resist", [Math.round(chance * 100)], 26);
                world.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
                done(action);
                return;
            }
            const ticks = Math.max(60, Math.round(p(hypnosisId, "gazeTicks", action)));
            if (!CombatStatus.inflict(world, target, "sleep", ticks)) {
                WorldFeedback.emit(world, hypnosisScene, 1, at, { moment: "immune", target: ref }, 22);
                WorldFeedback.text(world, hypnosisAbove(at), "world_combat.move.hypnosis.text.immune", [], 26);
                world.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
                done(action);
                return;
            }
            const existing = world.effects(target, hypnosisTrance);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(hypnosisTrance, target, JSON.stringify({ total: ticks, rings: rings }), ticks + 4);
            WorldFeedback.emit(world, hypnosisScene, 1, at,
                { moment: "sleep", target: ref, rings: rings, ticks: Math.round(ticks / 20), scale: Math.max(0.6, Math.min(1.8, radius / 0.42)) }, 32);
            WorldFeedback.text(world, hypnosisAbove(at), "world_combat.move.hypnosis.text.sleep", [Math.round(ticks / 20)], 32);
            sound(action, "cobblemon:move.sleeppowder.target");
            done(action);
        }
    });
}
