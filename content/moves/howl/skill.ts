/**
 * 长嚎 / howl — 执行组织与结算。
 *
 * 核心念头：仰头一声长嗥，把身边整群伙伴的气势一起吼起来——声浪一圈圈荡开，被震到的伙伴身上升起一道向上的斗志，
 *   攻击一起抬高；嗥声在空气里回荡一阵，斗志也随之消散。
 *
 * 两幕：
 *   蓄（windup 播「仰头蓄势」，提交前只观察与预告，打断不花代价）。
 *   嗥（提交后）：施法者先抬攻击并挂上共享身份 world_combat:status/howl 的「斗志」窗口；再以声浪半径把同一份
 *     斗志补给范围内的友方（每 20 刻由标记向外回荡一次，后来走进范围的伙伴也会被吼起来）。
 * 结束：斗志走完或被清除时，这段嗥声抬起的攻击等级原样收回——对手有一次拖过窗口的反制。
 */
namespace PokemonSkills {
    const howlScene = "world_combat:move_howl";
    const howlEffect = "world_combat:howl_rally";
    const howlMark = "world_combat:howl_mark";
    const howlStatus = "howl";
    const howlText = "world_combat.move.howl.text.rally";
    const howlFadeText = "world_combat.move.howl.text.fade";
    /** 表现里的参考半径：`data.scale = 实际声浪半径 / 这个数`。 */
    const howlReferenceRadius = 4.0;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function howlStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function howlRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = howlStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, howlStage(world, actor, stat) - before);
    }
    function howlScale(radius: number): number {
        return Math.max(0.5, Math.min(2, (radius || howlReferenceRadius) / howlReferenceRadius));
    }

    // 「斗志」持续画面：低密度、贴着身体向上走，让出目标本体视线。
    function howlKeep(world: CombatWorld, actor: CombatActor, scale: number, motes: number, levels: number, ticks: number): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_howl/rally/" + String(actor.ref()), howlScene, 1, body.position(),
            { moment: "rally", target: String(actor.ref()), motes: motes, levels: levels, scale: scale,
                intensity: Math.max(0.6, Math.min(2, levels + motes / 30)) }, Math.max(40, Math.min(200, ticks)));
    }

    // 以施法者为锚的声浪：范围内的友方还没被吼起来就各抬一次攻击并挂上斗志窗口；返回被吼到的人数。
    function howlRallyAround(world: CombatWorld, caster: CombatActor, radius: number, levels: number,
        ticks: number, motes: number, scale: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = 0;
        function rouse(actor: CombatActor): void {
            if (MobEffects.read(world, actor, howlEffect) === null) {
                MobEffects.apply(world, actor, howlEffect, ticks, levels);
                NativeEffects.boost(world, actor, "atk", levels);
            }
            howlKeep(world, actor, scale, motes, levels, ticks);
            reached++;
        }
        rouse(caster);
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            rouse(other);
        }
        return reached;
    }

    WorldCombat.effect(howlMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["radius", "levels", "motes", "scale", "ticks"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid howl mark: " + key);
        });
        if (typeof value.caster !== "string") throw new Error("Invalid howl source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(howlMark, "start", function (effect) { effect.schedule("echo", "echo", 4, "{}"); });
    WorldCombat.effectHandler(howlMark, "echo", function (effect) {
        const world = effect.world(), caster = effect.target(), state = JSON.parse(effect.state());
        if (world.observe(caster) === null || MobEffects.read(world, caster, howlEffect) === null) { effect.end(); return; }
        const radius = Math.max(1, Number(state.radius) || 3.2);
        const levels = Math.max(1, Math.round(Number(state.levels) || 1));
        const motes = Math.max(1, Math.round(Number(state.motes) || 20));
        const scale = Number(state.scale) || 1;
        howlRallyAround(world, caster, radius, levels, Math.max(60, effect.remaining()), motes, scale);
        effect.schedule("echo", "echo", 20, "{}");
    });
    WorldCombat.effectHandler(howlMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 斗志走完或被清除：把这段嗥声抬起的攻击等级原样收回（只收到当前实际持有的正等级，避免抹掉别处的增益）。
    WorldCombat.on("world_combat:move_howl/fade", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== howlEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, howlStage(world, actor, "atk")));
        if (loss > 0) NativeEffects.boost(world, actor, "atk", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, howlScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        if (String(data.cause) === "expired") WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), howlFadeText, [], 22);
    });

    define({
        id: "howl",
        name: "长嚎",
        description: "仰头一声长嗥，提高自己与身边队友的攻击；嗥声回荡一阵，斗志消散时这段提升一并收回。",
        uses: ["开战前把全队的物攻抬起来", "把后来走进范围的伙伴也吼起来", "单打独斗时集中气势，把攻击拉高两级"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 120,
        style: "cry",
        stationary: true,
        defaults: { cry: 1, ai: { maxChase: 14, minGap: 3 } },
        fields: [
            field(pathOf("cry"), "嚎法", "choice", {
                options: [
                    { value: 1, label: "群嚎" },
                    { value: 0, label: "独啸" }
                ],
                help: "群嚎：自己与半径内每个伙伴各 +1 级、范围大、窗口长，代价是起手 +1 刻、冷却 ×1.1，单人所获较少；独啸：只吼自己、+2 级、起手 −1 刻、冷却 ×0.9，但完全不顾队友。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("howl", "radius", pokemon) : 4.0, geometry: "area", style: "cry", color: 0xE8A54B,
                label: config && Number(config.cry) === 1 ? "长嚎 · 群嚎" : "长嚎 · 独啸" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["howl"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p("howl", "tempo", context))),
                recover: Math.round(p("howl", "aftercast", context)),
                cooldown: Math.round(p("howl", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_howl:draw", howlScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", cry: config && Number(config.cry) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const levels = Math.max(1, Math.min(2, Math.round(p("howl", "raise", action))));
            const radius = Math.max(1, p("howl", "radius", action));
            const ticks = Math.max(80, Math.round(p("howl", "rallyTicks", action)));
            const motes = Math.max(8, Math.round(p("howl", "motes", action)));
            const scale = howlScale(radius);
            MobEffects.apply(world, actor, howlEffect, ticks, levels);
            NativeEffects.boost(world, actor, "atk", levels);
            world.effect(howlMark, actor, JSON.stringify({ radius: radius, levels: levels, motes: motes, scale: scale, ticks: ticks, caster: String(actor.ref()) }), ticks);
            const reached = howlRallyAround(world, actor, radius, levels, Math.max(80, Math.round(ticks * 0.85)), motes, scale);
            WorldFeedback.emit(world, howlScene, 1, body.position(),
                { moment: "howl", target: String(actor.ref()), motes: motes, levels: levels, radius: radius, scale: scale,
                    reached: reached, intensity: Math.max(0.8, Math.min(2, levels + motes / 40)) }, 40);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), howlText,
                [levels, reached, Math.round(ticks / 20)], 40);
            world.sound("minecraft:entity.wolf.howl", body.position(), 18, "{}");
            done(action);
        }
    });

    // 嗥声消散：施法者的标记走完时，让同一声嗥在场上留一记尾音（画面由各自的 fade 事件负责）。
    WorldCombat.on("world_combat:move_howl/echoend", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== howlEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const views = world.effects(actor, howlMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    });
}
