/**
 * 点穴 / acupressure — 执行组织。
 *
 * 核心念头：贴近给自己或伙伴随机点通一项尚未满的能力——按中哪个穴道，哪项能力短时抬起来。
 *   共用七项能力阶梯（物攻/防御/特攻/特防/速度/命中/闪避）都按共享身份读、按真实有效值排除满级；
 *   一轮点穴只强化一项，通畅窗口结束或被清除时，只撤本招这一次贡献的那一项。
 *
 * 近身契约：执行时再次核对真实距离与接触——目标走开、中间隔墙都按空放收手，绝不隔空点穴、不穿墙摸人。
 */
namespace PokemonSkills {
    const acupressureScene = "world_combat:move_acupressure";
    const acupressureFlow = "world_combat:acupressure_flow";
    const acupressureContribution = "world_combat:move/acupressure";
    /** 共享七项能力阶梯；每一类对任意战斗者都有已声明的消费者（六维投影 / 共享命中模型）。 */
    const acupressureStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    /** 表现里的参考半径：`data.scale = 实际点穴距离 / 这个数`。 */
    const acupressureReference = 2.0;
    /** 抽中项对应身上固定的一处小穴点（相对中等体型，`fit:"body"` 再按实际体型缩放）。 */
    const acupressurePoints: { [stat: string]: number[] } = {
        atk: [0.24, 0.34, 0.12],
        def: [0.02, 0.14, -0.22],
        spa: [0.12, 0.6, 0.08],
        spd: [-0.2, 0.36, -0.12],
        spe: [0.18, -0.28, 0.02],
        accuracy: [0.0, 0.62, 0.16],
        evasion: [-0.22, 0.32, 0.16]
    };
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
    function acupressurePoint(stat: string): number[] {
        return acupressurePoints[stat] || acupressurePoints.atk;
    }

    /** 目标身上可点的那几项（未满 +6）。 */
    function acupressureOpen(world: CombatWorld, target: CombatActor): string[] {
        const open: string[] = [];
        for (let index = 0; index < acupressureStats.length; index++) {
            if (NativeEffects.effectiveStage(world, target, acupressureStats[index]) < 6) open.push(acupressureStats[index]);
        }
        return open;
    }
    /** 空选按既有 self 许可回落到自己；显式选择的友方原样返回。 */
    function acupressureTarget(action: CombatAction, config: any): CombatActor | null {
        const target = action.target();
        if (target !== null) return target;
        return config && config.allowSelf === false ? null : action.actor();
    }
    /** 近身可接触：真实距离内、射线先碰到目标而不是墙；自己则总是点到。 */
    function acupressureTouch(action: CombatAction, target: CombatActor): boolean {
        const world = action.sense(), actor = action.actor();
        const body = world.observe(actor), pressed = world.observe(target);
        if (body === null || pressed === null) return false;
        if (String(target.ref()) === String(actor.ref())) return true;
        const from = body.position(), to = pressed.position();
        if (from.minus(to).length() > Math.max(1.0, p("acupressure", "reach", action))) return false;
        const impact = action.trace(from, to, 0.35, true);
        const hit = impact.target();
        return hit !== null && String(hit.ref()) === String(target.ref()) && !impact.blocked();
    }

    define({
        id: "acupressure",
        cooldownParameter: "wait",
        name: "点穴",
        description: "贴近给自己或近处伙伴随机点通一项尚未满的能力：按中哪个穴道，哪项能力就短时抬起来。一轮只点一项，通畅结束或被清除时只收回该项贡献。目标走开或隔墙都按空放。",
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
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = acupressureTarget(action, config);
            if (target === null || !world.valid(target) || !world.friendly(target)) return "invalid-target";
            if (MobEffects.read(world, target, acupressureFlow)) return "already-active";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            const from = action.origin(), to = body.position();
            if (from.minus(to).length() > p("acupressure", "reach", action)) return "out-of-range";
            if (String(target.ref()) !== String(actor.ref()) && !world.clear(from, to)) return "target-not-visible";
            return acupressureOpen(world, target).length > 0 ? "" : "no-open-point";
        },
        windup: function (action, config, prepare) {
            const target = acupressureTarget(action, config);
            action.present("world_combat:move_acupressure:seek", acupressureScene, 1, action.origin(),
                JSON.stringify({ moment: "seek", target: target === null ? "" : String(target.ref()), steady: config && config.steady === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = acupressureTarget(action, config);
            if (target === null || !world.valid(target) || !world.friendly(target)) { done(action); return; }
            if (MobEffects.read(world, target, acupressureFlow)) { done(action); return; }
            // 真实近身接触：跑开、隔墙都按空放，不隔空点穴。
            if (!acupressureTouch(action, target)) { done(action); return; }
            const open = acupressureOpen(world, target);
            if (open.length === 0) { done(action); return; }
            const pressed = world.observe(target), body = world.observe(actor);
            if (pressed === null || body === null) { done(action); return; }
            const steady = !!(config && config.steady === true);
            const press = Math.max(1, Math.min(2, Math.round(p("acupressure", "press", action))));
            const window = Math.max(120, Math.round(p("acupressure", "window", action)));
            const reach = Math.max(1.0, p("acupressure", "reach", action));
            const motes = Math.max(10, Math.round(p("acupressure", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("acupressure", "beats", action))));
            const roll = Math.max(0, Math.min(open.length - 1, Math.floor(world.random() * open.length)));
            const stat = open[roll];
            const index = acupressureStats.indexOf(stat);
            const before = NativeEffects.effectiveStage(world, target, stat), changes: { [stat: string]: number } = {};
            changes[stat] = Math.min(press, 6 - before);
            const carrier = MobEffects.apply(world, target, acupressureFlow, window, 0);
            if (!carrier) { done(action); return; }
            const windowId = NativeEffects.boostWindow(world, target, changes, window, acupressureContribution, carrier);
            const levels = NativeEffects.effectiveStage(world, target, stat) - before;
            if (!windowId || levels === 0) {
                if (windowId) NativeEffects.windowClose(world, windowId);
                MobEffects.consume(world, target, acupressureFlow);
                done(action); return;
            }
            const scale = reach / acupressureReference;
            const at = acupressurePoint(stat);
            const data = { moment: "press", target: String(target.ref()), stat: stat, index: index, press: levels,
                motes: motes, beats: beats, scale: scale, steady: steady ? 1 : 0, ax: at[0], ay: at[1], az: at[2],
                intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) };
            WorldFeedback.emit(world, acupressureScene, 1, pressed.position(), data, 30);
            // 通畅期间只在被点中的穴道留一枚小点；窗口到期、被清除或刷新时随窗口一起收。
            WorldFeedback.onEffect(world, windowId, "world_combat:move_acupressure/flow", acupressureScene, 1, pressed.position(),
                { moment: "flow", target: String(target.ref()), stat: stat, index: index, motes: Math.max(8, Math.round(motes / 3)),
                    scale: scale, ax: at[0], ay: at[1], az: at[2] });
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
