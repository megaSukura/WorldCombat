/**
 * 点穴 / acupressure — 执行组织。
 *
 * 核心念头：朝一处穴道按下去——按准哪一处不由你定，身体当下最空的那几处里随机开一处，那项能力当场抬起来；
 *   手可以按在自己身上，也可以按在身边的伙伴身上。
 *
 * 两幕：
 *   找穴（windup 播「探手」，提交前只观察与预告，按下的穴道还没定）。
 *   落指（提交后）：在目标当前未满 +6 的能力里随机取一项，NativeEffects.boost 把它抬高 press 级；
 *     给目标挂共享身份 world_combat:status/acupressure 的通畅窗口，并另存一份「这次点了哪项、抬了几级」的
 *     记号（world_combat:acupressure_mark），供窗口结束时按项、按数收回。
 * 结束：通畅窗口走完或被清除时，按记号把那项等级原样收回。
 *
 * 随机的意义：同族里只有它一次至少抬一项，玩家与对手都得接受这一按的运气；点满 +6 的能力会被跳过，
 *   所以它不会把已经顶格的一项再堆一遍。
 */
namespace PokemonSkills {
    const acupressureScene = "world_combat:move_acupressure";
    const acupressureFlow = "world_combat:acupressure_flow";
    const acupressureMark = "world_combat:acupressure_mark";
    /** 宝可梦带命中与闪避；其他生物的共享阶梯只有六维里的五项。 */
    const acupressureAllStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    const acupressureSharedStats = ["atk", "def", "spa", "spd", "spe"];
    /** 表现里的参考半径：`data.scale = 实际点穴距离 / 这个数`。 */
    const acupressureReference = 2.0;

    /** 这次点起来的能力与级数；窗口结束时照数收回。 */
    WorldCombat.effect(acupressureMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.stat !== "string" || typeof value.levels !== "number" || !isFinite(value.levels)) throw new Error("Invalid acupressure mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(acupressureMark, "start", function () { });

    /** 目标身上可点的那几项（未满 +6）。 */
    function acupressureOpen(world: CombatWorld, target: CombatActor): string[] {
        const stats = String(target.domain()) === "cobblemon" ? acupressureAllStats : acupressureSharedStats, open: string[] = [];
        const state = String(target.domain()) === "cobblemon" ? NativeEffects.read(world, target) : null;
        for (let index = 0; index < stats.length; index++) {
            const stage = state !== null ? NativeEffects.stage(state, stats[index]) : CombatStages.stage(world, target, stats[index]);
            if (stage < 6) open.push(stats[index]);
        }
        return open;
    }
    /** 读取一项能力等级；宝可梦读原生等级，其他生物读共享阶梯。 */
    function acupressureStage(world: CombatWorld, target: CombatActor, stat: string): number {
        return String(target.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, target), stat)
            : CombatStages.stage(world, target, stat);
    }
    /** 抬高并返回这一次真正抬到的级数。 */
    function acupressureRaise(world: CombatWorld, target: CombatActor, stat: string, amount: number): number {
        const before = acupressureStage(world, target, stat);
        NativeEffects.boost(world, target, stat, amount);
        return Math.max(0, acupressureStage(world, target, stat) - before);
    }
    /** 掐掉目标身上上一轮点穴的记号（重复施放时避免按错项收回）。 */
    function acupressureClearMark(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, acupressureMark);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    /** 被点中的那项能力的浮字键；一项一句，玩家一眼看出这次点到了哪里。 */
    const acupressureTextKeys: { [stat: string]: string } = {
        atk: "world_combat.move.acupressure.text.atk",
        def: "world_combat.move.acupressure.text.def",
        spa: "world_combat.move.acupressure.text.spa",
        spd: "world_combat.move.acupressure.text.spd",
        spe: "world_combat.move.acupressure.text.spe",
        accuracy: "world_combat.move.acupressure.text.accuracy",
        evasion: "world_combat.move.acupressure.text.evasion"
    };
    function acupressureText(stat: string): string {
        return acupressureTextKeys[stat] || "world_combat.move.acupressure.text.atk";
    }

    define({
        id: "acupressure",
        name: "点穴",
        description: "通过点穴让身体舒筋活络，大幅提高随机一项能力；也可以按在身边的伙伴身上。",
        uses: ["随机补足一项能力，把偏科的身体推向更利的方向", "把伙伴最缺的那一项能力按起来", "拉锯里用快按频繁补，关键时用稳按一次补足"],
        kind: "friend",
        range: 2,
        maxRange: 4,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 110,
        style: "press",
        defaults: { steady: false, allowSelf: true, ai: { maxChase: 6, minGap: 2 } },
        fields: [flag("steady", "稳按")],
        indicator: function (config, pokemon) {
            return { radius: p("acupressure", "reach", pokemon), geometry: "circle", style: "press", color: 0xE8B45A,
                label: config && config.steady === true ? "点穴 · 稳按" : "点穴 · 快按" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["acupressure"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("acupressure", "tempo", context)),
                recover: Math.round(p("acupressure", "aftercast", context)),
                cooldown: Math.round(p("acupressure", "wait", context)),
                active: 1,
                range: p("acupressure", "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("acupressure", "reach", action)) return "out-of-range";
            return acupressureOpen(world, target).length > 0 ? "" : "no-open-point";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_acupressure:seek", acupressureScene, 1, action.origin(),
                JSON.stringify({ moment: "seek", target: target === null ? "" : String(target.ref()), steady: config && config.steady === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const pressed = world.observe(target);
            if (pressed === null) { done(action); return; }
            const open = acupressureOpen(world, target);
            if (open.length === 0) { done(action); return; }
            const steady = !!(config && config.steady === true);
            const press = Math.max(2, Math.min(3, Math.round(p("acupressure", "press", action))));
            const window = Math.max(120, Math.round(p("acupressure", "window", action)));
            const reach = Math.max(1.0, p("acupressure", "reach", action));
            const motes = Math.max(10, Math.round(p("acupressure", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("acupressure", "beats", action))));
            const roll = Math.max(0, Math.min(open.length - 1, Math.floor(world.random() * open.length)));
            const stat = open[roll];
            const index = acupressureAllStats.indexOf(stat);
            const levels = acupressureRaise(world, target, stat, press);
            acupressureClearMark(world, target);
            MobEffects.apply(world, target, acupressureFlow, window, levels);
            world.effect(acupressureMark, target, JSON.stringify({ stat: stat, levels: levels }), window);
            const scale = reach / acupressureReference;
            const path: (string | number[])[] = String(target.ref()) === String(actor.ref()) ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, acupressureScene, 1, pressed.position(),
                { moment: "press", path: path, target: String(target.ref()), stat: stat, index: index, press: levels,
                    motes: motes, beats: beats, scale: scale, steady: steady ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) }, 30);
            WorldFeedback.keep(world, "acupressure:flow:" + String(target.ref()), acupressureScene, 1, pressed.position(),
                { moment: "flow", target: String(target.ref()), stat: stat, index: index, motes: motes, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, pressed.position().plus(WorldCombat.point(0, 1.3, 0)), acupressureText(stat), [levels], 32);
            world.sound("minecraft:block.stone_pressure_plate.click_on", pressed.position(), 14, "{}");
            done(action);
        }
    });

    // 通畅窗口走完或被清除：按记号把那项能力原样收回（只收到当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_acupressure/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== acupressureFlow) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const marks = world.effects(target, acupressureMark);
        let stat = "", levels = 0;
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.stat === "string") stat = mark.stat;
            if (typeof mark.levels === "number") levels = Math.max(0, Math.round(mark.levels));
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        if (stat && levels > 0 && acupressureAllStats.indexOf(stat) >= 0) {
            const loss = Math.min(levels, Math.max(0, acupressureStage(world, target, stat)));
            if (loss > 0) NativeEffects.boost(world, target, stat, -loss);
        }
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, acupressureScene, 1, body.position(),
            { moment: "fade", target: String(target.ref()), stat: stat }, 22);
    });
}
