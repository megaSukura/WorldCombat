/** 点穴在一个通畅窗口内随机强化一项能力；窗口结束后再选下一项。 */
namespace PokemonSkills {
    const acupressureScene = "world_combat:move_acupressure";
    const acupressureFlow = "world_combat:acupressure_flow";
    /** 宝可梦可抽到命中与闪避；普通生物的点穴从五项战斗属性中选择。 */
    const acupressureAllStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    const acupressureSharedStats = ["atk", "def", "spa", "spd", "spe"];
    /** 表现里的参考半径：`data.scale = 实际点穴距离 / 这个数`。 */
    const acupressureReference = 2.0;

    /** 目标身上可点的那几项（未满 +6）。 */
    function acupressureOpen(world: CombatWorld, target: CombatActor): string[] {
        const stats = String(target.domain()) === "cobblemon" ? acupressureAllStats : acupressureSharedStats, open: string[] = [];
        for (let index = 0; index < stats.length; index++) {
            const stage = NativeEffects.effectiveStage(world, target, stats[index]);
            if (stage < 6) open.push(stats[index]);
        }
        return open;
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
        cooldownParameter: "wait",
        name: "点穴",
        description: "给自己或近处伙伴随机强化一项能力，通畅状态结束时恢复；这一轮结束后才能再次点穴。",
        uses: ["交战前为自己随机强化一项能力", "给近处伙伴一段短时强化", "安全时用稳按取得两级强化"],
        kind: "friend",
        range: 2,
        maxRange: 4,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 180,
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
            if (MobEffects.read(world, target, acupressureFlow)) return "already-active";
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
            if (target === null || !world.valid(target) || !world.friendly(target) || body === null
                || MobEffects.read(world, target, acupressureFlow)) { done(action); return; }
            const pressed = world.observe(target);
            if (pressed === null) { done(action); return; }
            const open = acupressureOpen(world, target);
            if (open.length === 0) { done(action); return; }
            const steady = !!(config && config.steady === true);
            const press = Math.max(1, Math.min(2, Math.round(p("acupressure", "press", action))));
            const window = Math.max(120, Math.round(p("acupressure", "window", action)));
            const reach = Math.max(1.0, p("acupressure", "reach", action));
            const motes = Math.max(10, Math.round(p("acupressure", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("acupressure", "beats", action))));
            const roll = Math.max(0, Math.min(open.length - 1, Math.floor(world.random() * open.length)));
            const stat = open[roll];
            const index = acupressureAllStats.indexOf(stat);
            const before = NativeEffects.effectiveStage(world, target, stat), changes: { [stat: string]: number } = {};
            changes[stat] = Math.min(press, 6 - before);
            const carrier = MobEffects.apply(world, target, acupressureFlow, window, 0);
            if (!carrier) { done(action); return; }
            const contribution = NativeEffects.boostWindow(world, target, changes, window, "world_combat:move/acupressure", carrier);
            const levels = NativeEffects.effectiveStage(world, target, stat) - before;
            if (!contribution || levels === 0) {
                if (contribution) NativeEffects.windowClose(world, contribution);
                else world.removeMobEffect(target, acupressureFlow, carrier.key());
                done(action); return;
            }
            const scale = reach / acupressureReference;
            const path: (string | number[])[] = String(target.ref()) === String(actor.ref()) ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, acupressureScene, 1, pressed.position(),
                { moment: "press", path: path, target: String(target.ref()), stat: stat, index: index, press: levels,
                    motes: motes, beats: beats, scale: scale, steady: steady ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) }, 30);
            WorldFeedback.keep(world, "acupressure:flow:" + String(target.ref()), acupressureScene, 1, pressed.position(),
                { moment: "flow", target: String(target.ref()), stat: stat, index: index, motes: motes, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, pressed.position().plus(WorldCombat.point(0, 1.3, 0)), acupressureText(stat), [levels > 0 ? "+" + levels : String(levels)], 32);
            world.sound("minecraft:block.stone_pressure_plate.click_on", pressed.position(), 14, "{}");
            done(action);
        }
    });

    // 属性窗口跟随原生状态回收；移除事件只负责收尾表现。
    WorldCombat.on("world_combat:move_acupressure/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== acupressureFlow) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, acupressureScene, 1, body.position(),
            { moment: "fade", target: String(target.ref()) }, 22);
    });
}
