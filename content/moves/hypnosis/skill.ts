/**
 * 催眠术 / hypnosis —— 执行组织。
 *
 * 核心念头：盯住对手，把一圈圈暗示光环沿一条通视的直线送进它脑里。它隔空，成败是一场意志对抗：
 *   压过去就当场睡下，压不过就散在对方身上。走位与通视是它的读法。
 *
 * 两幕：
 *   起（windup，提交前）：眼眶亮起、光环在头侧攒起，只播预告。
 *   送（wave → sleep / resist / immune / fizzle，提交后）：一道真实投射物沿「自身→目标」的直线飞过去；
 *     途中撞墙或先撞到别人就被挡下（不会绕过前景实体去够锁定者）。击中锁定目标后掷一次意志对抗，
 *     成功挂共享身份 world_combat:status/sleep（宝可梦那一层同步成原生睡眠），失败则光环散开。
 *
 * 选取 kind:"aim"：可指定实体，也可朝一个方向空放。空放时只送出一道暗示波，**无锁定时不自动选人**；
 *   挡墙失效、不能穿前景实体重新选锁定者。目标已有的状态不参与判定——它不要求对方干净。
 *
 * 睡着的余韵：命中后另起一个绑定效果 world_combat:hypnosis_trance 跟着目标，持续表现随该效果的生命周期
 *   播放（onEffect），每 20 刻收拢一次剩余环；睡眠被伤害打醒或被打断时它自己收场。
 *
 * 反制：切断视线、拉开到射程外、用更高特防与等级硬扛；睡眠本身一受伤害就解除。
 */
namespace PokemonSkills {
    function hypnosisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    // 睡意余韵：跟着睡者的绑定效果，持续表现随它起落；睡眠不在就收场。
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
        // 持续表现绑定这个托管效果：驱散或睡眠结束时它随效果一起清理，不会凭自己的时长继续播。
        // ringRadius 由剩余睡眠比例换算，是余韵环大小与实际剩余时间的唯一消费者。
        WorldFeedback.onEffect(world, effect.id(), "hypnosis:" + String(actor.ref()), hypnosisScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), ringRadius: Math.round((0.2 + 0.75 * ratio) * 100) / 100 });
        effect.schedule("tick", "tick", 20, "{}");
    });

    define({
        id: hypnosisId,
        cooldownParameter: "recharge",
        name: "催眠术",
        description: "沿一条通视的直线送出一道暗示波，命中锁定目标后当场让它睡下。它隔空，但成败取决于意志对抗——特攻与等级压不过对方的特防与等级就可能只散成一点困意。途中的墙或前景实体都会把波挡下；朝空处释放时只送出一波，不会自动挑人。",
        uses: ["在交战开始前先放倒一个远处的威胁", "为队友的食梦或恶梦制造睡眠窗口", "逼对手绕开视线或拉开距离"],
        kind: "aim",
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
            // 输入辅助目标为 null：朝方向空放，只送暗示波，不自动选人。
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
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
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = action.origin();
            const aimPoint = action.targetPosition();
            const rings = Math.max(4, Math.round(p(hypnosisId, "rings", action)));
            const radius = Math.max(0.18, p(hypnosisId, "gazeRadius", action));
            const speed = Math.max(0.4, p(hypnosisId, "waveSpeed", action));
            const chance = Math.max(0.05, Math.min(0.95, p(hypnosisId, "landChance", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.42));
            const ref = target === null ? "" : String(target.ref());
            const line: any = target !== null
                ? [String(actor.ref()), ref]
                : [[origin.x(), origin.y(), origin.z()], [aimPoint.x(), aimPoint.y(), aimPoint.z()]];
            sound(action, "cobblemon:move.sing.actor");
            // 真实通视细线：从自身连到目标/空放落点，表示这一波要走的路线；运动的前沿由下面的投射物承担。
            // rings 驱动细线密度与枪口爆发数量，scale 随落点半径缩放线宽与粒子尺寸。
            WorldFeedback.emit(world, hypnosisScene, 1, origin,
                { moment: "wave", path: line, rings: rings, scale: scale }, 26);
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/psychic/psyswirl", scale: scale, tint: 0x7D5BD8, glow: true
            };
            // 锁定实体时波跟着它飞；空放时只沿方向直飞。友方也参与碰撞（hitAllies），撞到就散、不改选目标。
            if (target !== null && world.valid(target))
                appearance.homing = { target: ref, turn: 18, delay: 1, range: action.range() };
            appearance.hitAllies = true;
            function land(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), victim = hit.target(), at = hit.position();
                // 只有锁定的那个非友方目标算数；被墙或前景实体挡下就散开，不重新选人。
                // 撞墙时用原生命中格 blockPosition 作为散开点；实体接触没有方块格就用命中位置。
                if (target === null || victim === null || !scope.valid(target) || scope.friendly(victim)
                    || String(victim.ref()) !== ref) {
                    const cell = hit.blockPosition();
                    WorldFeedback.emit(scope, hypnosisScene, 1, cell === null ? at : cell, { moment: "fizzle" }, 18);
                    return;
                }
                if (scope.random() >= chance) {
                    WorldFeedback.emit(scope, hypnosisScene, 1, at, { moment: "resist", target: ref, rings: rings }, 22);
                    WorldFeedback.text(scope, hypnosisAbove(at), "world_combat.move.hypnosis.text.resist", [Math.round(chance * 100)], 26);
                    scope.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
                    return;
                }
                const ticks = Math.max(60, Math.round(p(hypnosisId, "gazeTicks", action)));
                if (!CombatStatus.inflict(scope, victim, "sleep", ticks)) {
                    WorldFeedback.emit(scope, hypnosisScene, 1, at, { moment: "immune", target: ref }, 22);
                    WorldFeedback.text(scope, hypnosisAbove(at), "world_combat.move.hypnosis.text.immune", [], 26);
                    scope.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
                    return;
                }
                const existing = scope.effects(victim, hypnosisTrance);
                for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                scope.effect(hypnosisTrance, victim, JSON.stringify({ total: ticks, rings: rings }), ticks + 4);
                WorldFeedback.emit(scope, hypnosisScene, 1, at,
                    { moment: "sleep", target: ref, rings: rings, scale: scale }, 32);
                WorldFeedback.text(scope, hypnosisAbove(at), "world_combat.move.hypnosis.text.sleep", [Math.round(ticks / 20)], 32);
                sound(current, "cobblemon:move.sleeppowder.target");
            }
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, appearance: appearance,
                impact: function (current, hit) { land(current, hit); }
            }, done);
        }
    });
}
