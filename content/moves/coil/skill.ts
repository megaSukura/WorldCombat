/**
 * 盘蜷 / coil 的出手方式。
 *
 * 核心念头：把身体一圈圈盘紧，能量环从外向里收拢；收到底后猛地一撑，攻击、防御与命中率一起抬起来。
 *   它是本族里最慢、也最完整的一支：窗口最长，把身位钉住，也把命中率一并拉正。
 *
 * 三幕：
 *   起势（windup，提交前）：压低重心、把身体盘起来，紫气从脚边聚拢；可被打断，打断不消耗任何东西。
 *   盘紧（提交后）：攻击、防御与命中能力等级一起抬起（原生各 +1，配置「盘紧」防御 +2），挂上共享身份
 *     world_combat:status/coil 的盘势窗口；同时另存一份「这次各加了多少」的记号，供窗口结束时按数收回。
 *     随后按 coils 一圈圈收紧能量环，并浮出结果。
 *   撑定（收势）：环从身上猛地荡开一下，盘势定住；窗口走完或被清除时，这次抬起的等级原样收回。
 *
 * 与同族分开：磨爪是快而廉价的随手一蹭（只抬攻与命中）；盘蜷是慢而完整的架势——抬三项、窗口最长、起手最慢。
 */
namespace PokemonSkills {
    const coilScene = "world_combat:move_coil";
    const coilBrace = "world_combat:coil_brace";
    const coilMark = "world_combat:coil_mark";
    const coilText = "world_combat.move.coil.text.braced";
    const coilFadeText = "world_combat.move.coil.text.faded";
    /** 表现里的参考半径：`data.scale = 实际盘绕半径 / 这个数`。 */
    const coilReference = 1.0;

    // 记号：记录这次盘蜷各自加了多少级，窗口结束时照数收回。加在三个属性上，单靠 amplifier 存不下。
    WorldCombat.effect(coilMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.rise !== "number" || typeof value.guard !== "number" || typeof value.focus !== "number")
            throw new Error("Invalid coil mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(coilMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function coilStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function coilRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = coilStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, coilStage(world, actor, stat) - before);
    }

    define({
        id: "coil",
        name: "盘蜷",
        description: "盘蜷着集中精神，从而提高自己的攻击、防御和命中率。",
        uses: ["开打前盘一圈，把攻/防/命中一起垫起来", "硬顶一轮物理爆发前把三项钉住", "把被削掉的命中等级重新盘正"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 95,
        style: "coil",
        stationary: true,
        defaults: { tight: false, ai: { maxChase: 16, minGap: 4 } },
        fields: [flag("tight", "盘紧")],
        indicator: function (config, pokemon) {
            return { radius: p("coil", "ring", pokemon), geometry: "area", style: "coil", color: 0x8A6FD8,
                label: config && config.tight === true ? "盘蜷 · 盘紧" : "盘蜷 · 松盘" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["coil"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("coil", "tempo", context)),
                recover: Math.round(p("coil", "aftercast", context)),
                cooldown: Math.round(p("coil", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_coil:draw", coilScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", tight: config && config.tight === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("coil", "rise", action))));
            const guard = Math.max(1, Math.min(2, Math.round(p("coil", "guard", action))));
            const focus = Math.max(1, Math.min(2, Math.round(p("coil", "focus", action))));
            const window = Math.max(120, Math.round(p("coil", "brace", action)));
            const coils = Math.max(8, Math.round(p("coil", "coils", action)));
            const ring = Math.max(0.6, p("coil", "ring", action));
            const scale = ring / coilReference;
            const gainedRise = coilRaise(world, actor, "atk", rise);
            const gainedGuard = coilRaise(world, actor, "def", guard);
            const gainedFocus = coilRaise(world, actor, "accuracy", focus);
            MobEffects.apply(world, actor, coilBrace, window, Math.max(gainedGuard, Math.max(gainedRise, gainedFocus)));
            world.effect(coilMark, actor, JSON.stringify({ rise: gainedRise, guard: gainedGuard, focus: gainedFocus }), window);
            const gain = gainedRise + gainedGuard + gainedFocus;
            const beat = Math.max(4, Math.min(12, Math.round(14 - coils / 4)));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                WorldFeedback.emit(scope, coilScene, 1, here.position(),
                    { moment: "rise", actor: String(actor.ref()), coils: coils, ring: ring, scale: scale,
                        guard: gainedGuard, gain: gain,
                        intensity: Math.max(0.8, Math.min(2, gain / 2 + coils / 24)) }, 32);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), coilText,
                    [gainedRise, gainedGuard, gainedFocus], 32);
                scope.sound("minecraft:block.beacon.power_select", here.position(), 16, "{}");
                finish(current);
            }
            WorldFeedback.emit(world, coilScene, 1, body.position(),
                { moment: "coil", actor: String(actor.ref()), coils: coils, ring: ring, scale: scale,
                    guard: gainedGuard, gain: gain, intensity: Math.max(0.7, Math.min(1.8, coils / 18)) }, 26);
            WorldFeedback.keep(world, "coil:aura:" + String(actor.ref()), coilScene, 1, body.position(),
                { moment: "hum", actor: String(actor.ref()), coils: Math.max(6, Math.round(coils / 3)), ring: ring, scale: scale },
                Math.min(window, 180));
            world.sound("cobblemon:move.minimize.actor", body.position(), 16, "{}");
            action.after(beat, settle);
        }
    });

    // 盘势窗口走完或被清除：按记号把这次盘出的攻/防/命中原样收回（只收到各自当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_coil/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== coilBrace) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, coilMark);
        let rise = 0, guard = 0, focus = 0;
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.rise === "number") rise = Math.max(0, Math.round(mark.rise));
            if (typeof mark.guard === "number") guard = Math.max(0, Math.round(mark.guard));
            if (typeof mark.focus === "number") focus = Math.max(0, Math.round(mark.focus));
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const lostRise = Math.min(rise, Math.max(0, coilStage(world, actor, "atk")));
        if (lostRise > 0) NativeEffects.boost(world, actor, "atk", -lostRise);
        const lostGuard = Math.min(guard, Math.max(0, coilStage(world, actor, "def")));
        if (lostGuard > 0) NativeEffects.boost(world, actor, "def", -lostGuard);
        const lostFocus = Math.min(focus, Math.max(0, coilStage(world, actor, "accuracy")));
        if (lostFocus > 0) NativeEffects.boost(world, actor, "accuracy", -lostFocus);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, coilScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), coilFadeText, [], 24);
    });
}
