/**
 * 变小 / minimize — 执行组织。
 *
 * 核心念头：把身体缩成一团——打向它的攻击更容易落空，但明显更大的身体踩下来时挨得更重。
 *
 * 两幕：
 *   蜷缩（windup 播「收身」，提交前只观察与预告，打断不花代价）。
 *   缩小（提交后）：NativeEffects.boost 把闪避等级写进公共能力阶梯（evade 级，宝可梦的原生闪避项），
 *     挂上共享身份 world_combat:status/minimize 的缩小窗口，并把这次算出的「闪避概率」与「踩踏加成」另存进
 *     world_combat:minimize_mark，供入场规则读取。
 *
 * 真闪避（本单元自带的入场规则）：
 *   带身份者被非自身来源的伤害命中时，先看体型——来袭身体体积 ≥ 1.3 倍（踩下来）就按踩踏加成放大伤害；
 *   否则按闪避概率掷一次，掷中就整段落空。这是「闪避率」在即时交战里真正生效的地方：
 *   共享的闪避等级目前只作宝可梦原生面板读数，命中结算没有消费入口（见报告“共享前置”）。
 *   `world.random()` 只在可写世界掷；规则排在原生入场处理之后，落空不会触发免疫浮字。
 * 结束：缩小窗口走完或被清除时，按 amplifier 把闪避等级原样收回；mark 一并清掉。
 */
namespace PokemonSkills {
    const minimizeScene = "world_combat:move_minimize";
    const minimizeSmall = "world_combat:minimize_small";
    const minimizeMark = "world_combat:minimize_mark";
    const minimizeSpot = "world_combat:status/minimize";
    const minimizeDodgeText = "world_combat.move.minimize.text.dodge";
    const minimizeTrampleText = "world_combat.move.minimize.text.trample";
    const minimizeFadeText = "world_combat.move.minimize.text.fade";
    /** 体积达到这个倍数才算「踩下来」。 */
    const minimizeTrampleRatio = 1.3;
    /** 表现里的参考尺度：`data.scale = 实际收缩尺度 / 这个数`。 */
    const minimizeReference = 0.6;

    WorldCombat.effect(minimizeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        ["dodge", "trample"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid minimize mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(minimizeMark, "start", function () { });

    function minimizeMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, minimizeMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function minimizeReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, minimizeMark);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function minimizeStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    function minimizeRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = minimizeStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, minimizeStage(world, actor, stat) - before);
    }
    function minimizeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    // 入场判定：带身份者被非自身来源命中时，大体型踩下来按踩踏加成放大，否则按闪避概率掷一次落空。
    MobEffects.reactTagged("world_combat:move_minimize/avoid", minimizeSpot, "world_combat:damage_incoming",
        function (event) { return event.target(); },
        function (event, target, _effect) {
            const data = JSON.parse(String(event.data()));
            if (!(data.amount > 0) || data.bypassesInvulnerability) return;
            const world = event.world(), source = event.actor();
            if (String(source.ref()) === String(target.ref())) return;
            const body = world.observe(target), other = world.observe(source);
            if (body === null || other === null) return;
            const mark = minimizeMarkOf(world, target);
            if (mark === null) return;
            const volume = (other.width() * other.height()) / Math.max(0.05, body.width() * body.height());
            if (volume >= minimizeTrampleRatio) {
                data.amount *= Math.max(1.1, Math.min(3, Number(mark.trample) || 1.5));
                event.data(JSON.stringify(data));
                WorldFeedback.emit(world, minimizeScene, 1, body.position(),
                    { moment: "trample", target: String(target.ref()), volume: Math.round(volume * 100) / 100 }, 24);
                WorldFeedback.text(world, minimizeAbove(body.position()), minimizeTrampleText, [], 24);
                return;
            }
            const chance = Math.max(0, Math.min(0.9, Number(mark.dodge) || 0));
            if (chance > 0 && world.random() < chance) {
                data.amount = 0;
                event.data(JSON.stringify(data));
                WorldFeedback.emit(world, minimizeScene, 1, body.position(),
                    { moment: "dodge", target: String(target.ref()), dodge: chance }, 20);
                WorldFeedback.text(world, minimizeAbove(body.position()), minimizeDodgeText, [], 20);
            }
        }, "world_combat:effects_incoming");

    define({
        id: "minimize",
        cooldownParameter: "wait",
        name: "变小",
        description: "蜷缩身体显得很小，大幅提高自己的闪避率；但明显更大的身体踩下来时挨得更重。",
        uses: ["被围住前先缩起来，让来袭的攻击落空", "在大型对手脚下求生，提防被一脚踩实", "拉锯里用缩小窗口换几秒安全"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 120,
        style: "shrink",
        stationary: true,
        defaults: { bold: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("bold", "大胆缩小")],
        indicator: function (config, pokemon) {
            return { radius: 1.0, geometry: "area", style: "shrink", color: 0x9FB8D8,
                label: config && config.bold === true ? "变小 · 大胆" : "变小 · 谨慎" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["minimize"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("minimize", "tempo", context)),
                recover: Math.round(p("minimize", "aftercast", context)),
                cooldown: Math.round(p("minimize", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_minimize:curl", minimizeScene, 1, action.origin(),
                JSON.stringify({ moment: "curl", bold: config && config.bold === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const bold = !!(config && config.bold === true);
            const evade = Math.max(2, Math.min(3, Math.round(p("minimize", "evade", action))));
            const window = Math.max(80, Math.round(p("minimize", "window", action)));
            const small = Math.max(0.3, p("minimize", "small", action));
            const dodge = Math.max(0.05, Math.min(0.6, p("minimize", "dodge", action)));
            const trample = Math.max(1.1, Math.min(3, p("minimize", "trample", action)));
            const motes = Math.max(10, Math.round(p("minimize", "motes", action)));
            const pulses = Math.max(2, Math.min(4, Math.round(p("minimize", "pulses", action))));
            const scale = small / minimizeReference;
            const levels = minimizeRaise(world, actor, "evasion", evade);
            MobEffects.apply(world, actor, minimizeSmall, window, levels);
            minimizeReleaseMark(world, actor);
            world.effect(minimizeMark, actor, JSON.stringify({ dodge: dodge, trample: trample }), window);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, minimizeScene, 1, feet,
                { moment: "tiny", actor: String(actor.ref()), evade: levels, dodge: dodge, trample: trample, motes: motes,
                    pulses: pulses, scale: scale, bold: bold ? 1 : 0, intensity: Math.max(0.8, Math.min(1.8, 0.7 + levels / 3 + dodge)) }, 30);
            WorldFeedback.keep(world, "minimize:shell:" + String(actor.ref()), minimizeScene, 1, body.position(),
                { moment: "hold", actor: String(actor.ref()), motes: motes, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, minimizeAbove(body.position()), "world_combat.move.minimize.text.small",
                [levels, Math.round(dodge * 100), Math.round(window / 20)], 32);
            world.sound("cobblemon:move.minimize.actor", body.position(), 14, "{}");
            done(action);
        }
    });

    // 缩小窗口走完或被清除：按 amplifier 把闪避等级原样收回，并清掉 mark。
    WorldCombat.on("world_combat:move_minimize/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== minimizeSmall) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(0, Math.round(Number(data.amplifier) || 0));
        const loss = Math.min(levels, Math.max(0, minimizeStage(world, actor, "evasion")));
        if (loss > 0) NativeEffects.boost(world, actor, "evasion", -loss);
        minimizeReleaseMark(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, minimizeScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, minimizeAbove(body.position()), minimizeFadeText, [], 22);
    });
}
