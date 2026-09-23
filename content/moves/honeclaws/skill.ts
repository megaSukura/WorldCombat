/**
 * 磨爪 / honeclaws 的出手方式。
 *
 * 核心念头：抬起前爪，在身前交叠着快速刮几下，火星从爪缝里迸出来——磨出的锋口留在一段时间里，
 *   攻击与命中率各抬一档。它是本族里最快、最便宜的一支：起手短、冷却短、窗口也短，磨掉了就再补一次。
 *
 * 三幕：
 *   起势（windup，提交前）：抬爪、压低重心，冷光与细火星在爪边聚拢；可被打断，打断不消耗任何东西。
 *   磨（提交后）：物攻与命中能力等级各抬起（原生 +1，配置「深磨」物攻 +2），挂上共享身份
 *     world_combat:status/honeclaws 的锋口窗口；同时另存一份「这次各加了多少」的记号，供窗口结束时按数收回。
 *     随后按 scrapes 刮几下，每下甩出爪痕与火星，命中能力等级在爪边亮起。
 *   收（收势）：锋口定住、浮出结果；窗口走完或被清除时，这次抬起的等级原样收回。
 *
 * 与同族分开：盘蜷是慢而完整的架势（攻/防/命中三项、窗口最长）；磨爪是随手一蹭，只抬攻与命中，最快、最便宜。
 */
namespace PokemonSkills {
    const honeclawsScene = "world_combat:move_honeclaws";
    const honeclawsEdge = "world_combat:honeclaws_edge";
    const honeclawsMark = "world_combat:honeclaws_mark";
    const honeclawsText = "world_combat.move.honeclaws.text.honed";
    const honeclawsFadeText = "world_combat.move.honeclaws.text.faded";
    /** 表现里的参考半径：`data.scale = 实际刮擦半径 / 这个数`。 */
    const honeclawsReference = 0.7;

    // 记号：记录这次磨爪各自加了多少级，窗口结束时照数收回。加在两个属性上，单靠 amplifier 存不下。
    WorldCombat.effect(honeclawsMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.rise !== "number" || typeof value.focus !== "number") throw new Error("Invalid hone claws mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(honeclawsMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function honeclawsStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function honeclawsRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = honeclawsStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, honeclawsStage(world, actor, stat) - before);
    }

    define({
        id: "honeclaws",
        cooldownParameter: "wait",
        name: "磨爪",
        description: "将爪子磨得更加锋利，从而提高自己的攻击和命中率。",
        uses: ["开打前先蹭两下，把攻与命中一起垫起来", "命中被削、连击失手时随手补一档", "用最短的窗口保持锋口常新"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 72,
        style: "claw",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "深磨")],
        indicator: function (config, _pokemon) {
            return { radius: honeclawsReference, geometry: "area", style: "claw", color: 0xD8E4F0,
                label: config && config.deep === true ? "磨爪 · 深磨" : "磨爪 · 快磨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["honeclaws"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("honeclaws", "tempo", context)),
                recover: Math.round(p("honeclaws", "aftercast", context)),
                cooldown: Math.round(p("honeclaws", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_honeclaws:draw", honeclawsScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("honeclaws", "rise", action))));
            const focus = Math.max(1, Math.min(2, Math.round(p("honeclaws", "focus", action))));
            const window = Math.max(80, Math.round(p("honeclaws", "edge", action)));
            const scrapes = Math.max(8, Math.round(p("honeclaws", "scrapes", action)));
            const gainedRise = honeclawsRaise(world, actor, "atk", rise);
            const gainedFocus = honeclawsRaise(world, actor, "accuracy", focus);
            MobEffects.apply(world, actor, honeclawsEdge, window, Math.max(gainedRise, gainedFocus));
            world.effect(honeclawsMark, actor, JSON.stringify({ rise: gainedRise, focus: gainedFocus }), window);
            const gain = gainedRise + gainedFocus;
            WorldFeedback.emit(world, honeclawsScene, 1, body.position(),
                { moment: "hone", actor: String(actor.ref()), scrapes: scrapes, rise: gainedRise, focus: gainedFocus,
                    gain: gain, shine: Math.max(6, gain * 7), scale: 1,
                    intensity: Math.max(0.8, Math.min(2, gain / 2 + scrapes / 40)) }, 30);
            WorldFeedback.keep(world, "honeclaws:edge:" + String(actor.ref()), honeclawsScene, 1, body.position(),
                { moment: "hum", actor: String(actor.ref()), scrapes: Math.max(6, Math.round(scrapes / 3)) }, Math.min(window, 120));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), honeclawsText, [gainedRise, gainedFocus], 30);
            world.sound("cobblemon:move.dragonclaw.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 锋口窗口走完或被清除：按记号把这次磨出的物攻与命中原样收回（只收到各自当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_honeclaws/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== honeclawsEdge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, honeclawsMark);
        let rise = 0, focus = 0;
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.rise === "number") rise = Math.max(0, Math.round(mark.rise));
            if (typeof mark.focus === "number") focus = Math.max(0, Math.round(mark.focus));
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const lostRise = Math.min(rise, Math.max(0, honeclawsStage(world, actor, "atk")));
        if (lostRise > 0) NativeEffects.boost(world, actor, "atk", -lostRise);
        const lostFocus = Math.min(focus, Math.max(0, honeclawsStage(world, actor, "accuracy")));
        if (lostFocus > 0) NativeEffects.boost(world, actor, "accuracy", -lostFocus);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, honeclawsScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), honeclawsFadeText, [], 22);
    });
}
