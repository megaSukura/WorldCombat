/**
 * 顺风 / tailwind — 执行组织。
 *
 * 核心念头：施法者当场搅起一股旋风，风先在脚边收成气旋、再猛地铺开扫过身边的伙伴——整支队伍被同一阵风托住，
 *   比对面先动；风以施法者为锚一路转着，谁站在风里谁就快一档。
 *
 * 两幕：
 *   起（windup 播「收风」，提交前只观察与预告，打断不花代价）。
 *   托（提交后）：NativeEffects.boost(spe, gift) 把速度写进公共能力阶梯，施法者与半径内的友方各挂一份
 *     共享身份 world_combat:status/tailwind 的真实 MobEffect（本单元效果 world_combat:tailwind_gale），
 *     各自实际抬到的级数存进该效果等级；施法者身上另留一份 world_combat:tailwind_wind 记下风场数据。
 * 持续：每 20 刻按风场数据续一次画面；施法者身边的大气旋跟着他转，每个受风者身上拖出自己的风线。
 * 结束：风速窗口到期或被清除时，按该效果等级把速度原样收回；施法者身上的风场一并收束。
 */
namespace PokemonSkills {
    const tailwindScene = "world_combat:move_tailwind";
    const tailwindEffect = "world_combat:tailwind_gale";
    const tailwindMark = "world_combat:tailwind_wind";
    const tailwindRideText = "world_combat.move.tailwind.text.ride";
    const tailwindFadeText = "world_combat.move.tailwind.text.fade";
    /** 表现里的参考半径：`data.scale = 实际风场半径 / 这个数`。 */
    const tailwindReferenceRadius = 6.0;

    WorldCombat.effect(tailwindMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["radius", "motes", "streaks", "window"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid tailwind wind mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tailwindMark, "start", function () { });
    WorldCombat.effectHandler(tailwindMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function tailwindStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function tailwindRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = tailwindStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, tailwindStage(world, actor, stat) - before);
    }

    /**
     * 把风托到一个人身上：抬高速度、挂身份窗口、播一次受风画面。
     * 已经带着同一身份的人不重复抬，避免叠加与结算错乱。
     */
    function tailwindCatch(world: CombatWorld, actor: CombatActor, gift: number, ticks: number, streaks: number, motes: number): boolean {
        if (MobEffects.read(world, actor, tailwindEffect) !== null) return false;
        const granted = tailwindRaise(world, actor, "spe", gift);
        MobEffects.apply(world, actor, tailwindEffect, ticks, granted);
        const body = world.observe(actor);
        if (body !== null) {
            WorldFeedback.emit(world, tailwindScene, 1, body.position(),
                { moment: "catch", target: String(actor.ref()), streaks: streaks, motes: motes, gift: granted,
                    intensity: Math.max(0.7, Math.min(2, granted / 2 + 0.3)) }, 26);
        }
        return true;
    }

    /** 给施法者与半径内友方一起托风；返回这次风托住的人数。 */
    function tailwindSweep(world: CombatWorld, caster: CombatActor, radius: number, ticks: number, gift: number, streaks: number, motes: number): number {
        let reached = 0;
        if (tailwindCatch(world, caster, gift, ticks, streaks, motes)) reached++;
        const body = world.observe(caster);
        if (body === null) return reached;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (world.observe(other) === null) continue;
            if (tailwindCatch(world, other, gift, ticks, streaks, motes)) reached++;
        }
        return reached;
    }

    define({
        id: "tailwind",
        cooldownParameter: "wait",
        name: "顺风",
        description: "起一股旋风托住自己与身边的队友，全队的速度一起提高；风以施法者为锚转着，最长的加速窗口。",
        uses: ["开打前把整队的速度垫起来", "在被追上之前让全队先动起来", "把队友连成一队一起压上去"],
        kind: "self",
        range: 6,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gale",
        stationary: true,
        defaults: { gale: 1, ai: { maxChase: 9, minGap: 3 } },
        fields: [
            field(pathOf("gale"), "风向", "choice", {
                options: [
                    { value: 1, label: "广风" },
                    { value: 0, label: "长风" }
                ],
                help: "广风：半径 ×1.25、风点 ×1.1，但窗口 ×0.8，铺得开、停得早；长风：窗口 ×1.35，但半径 ×0.85、风点 ×0.9，罩得紧、撑得久。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("tailwind", "reach", pokemon) : 6, geometry: "area", style: "gale", color: 0xBEE9F2,
                label: config && Number(config.gale) === 1 ? "顺风 · 广风" : "顺风 · 长风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tailwind"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tailwind", "tempo", context)),
                recover: Math.round(p("tailwind", "aftercast", context)),
                cooldown: Math.round(p("tailwind", "wait", context)),
                active: 1,
                range: p("tailwind", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tailwind:gather", tailwindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", gale: config && Number(config.gale) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(2, Math.min(3, Math.round(p("tailwind", "gift", action))));
            const window = Math.max(120, Math.round(p("tailwind", "window", action)));
            const radius = Math.max(1.5, p("tailwind", "reach", action));
            const motes = Math.max(16, Math.round(p("tailwind", "motes", action)));
            const streaks = Math.max(4, Math.round(p("tailwind", "streaks", action)));
            const scale = radius / tailwindReferenceRadius;
            world.effect(tailwindMark, actor, JSON.stringify({ radius: radius, motes: motes, streaks: streaks, window: window }), window);
            const reached = tailwindSweep(world, actor, radius, window, gift, streaks, motes);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, tailwindScene, 1, feet,
                { moment: "burst", target: String(actor.ref()), gift: gift, radius: radius, motes: motes, streaks: streaks,
                    scale: scale, intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.4)) }, 30);
            WorldFeedback.keep(world, "tailwind:gale:" + String(actor.ref()), tailwindScene, 1, body.position(),
                { moment: "ride", target: String(actor.ref()), motes: motes, streaks: streaks, scale: scale }, Math.min(window, 400));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), tailwindRideText,
                [gift, reached, Math.round(window / 20)], 34);
            world.sound("cobblemon:move.gust.actor", body.position(), 16, "{}");
            world.sound("minecraft:entity.breeze.whirl", body.position(), 14, "{}");
            done(action);
        }
    });

    // 受风：每 20 刻续一次画面；施法者（身上带着风场标记）身边的大气旋跟着他转，每个受风者拖出自己的风线。
    WorldCombat.on("world_combat:move_tailwind/ride", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailwindEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const views = world.effects(actor, tailwindMark);
        const wind = views.length ? JSON.parse(String(views[0].data())) : null;
        const motes = wind ? Math.max(8, Math.round(Number(wind.motes) || 28)) : 20;
        const streaks = wind ? Math.max(3, Math.round(Number(wind.streaks) || 6)) : 5;
        const scale = wind ? Math.max(0.6, Math.min(2, (Number(wind.radius) || 6) / tailwindReferenceRadius)) : 1;
        WorldFeedback.keep(world, "tailwind:streak:" + String(actor.ref()), tailwindScene, 1, body.position(),
            { moment: "streaks", target: String(actor.ref()), streaks: streaks, motes: motes, scale: scale }, 40);
        if (wind !== null) {
            WorldFeedback.keep(world, "tailwind:gale:" + String(actor.ref()), tailwindScene, 1, body.position(),
                { moment: "ride", target: String(actor.ref()), motes: motes, streaks: streaks, scale: scale }, 40);
        }
    });

    // 风停：按实际抬到的级数把速度原样收回，播一次收束；施法者的风场同时收掉。
    WorldCombat.on("world_combat:move_tailwind/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailwindEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const granted = Math.max(0, Math.round(Number(data.amplifier) || 0));
        const loss = Math.min(granted, Math.max(0, tailwindStage(world, actor, "spe")));
        if (loss > 0) NativeEffects.boost(world, actor, "spe", -loss);
        const views = world.effects(actor, tailwindMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tailwindScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), lost: loss }, 24);
        if (views.length) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), tailwindFadeText, [], 24);
    });
}
