/**
 * 点穴 / acupressure — 执行组织。
 *
 * 核心念头：贴近给自己或伙伴点通一项能力。先找当前有效等级最低的一项——若是负等级，这一按就集中把它补回来；
 *   没有负项才在未满项里随机点。回合只强化一项，通畅窗口结束或被清除时，只撤本招这一次贡献的那一项。
 *
 * 选穴（新的取舍）：负等级优先按最低者，同级平局随机；补 1/2 级可越过 0 但不超 +6。
 *   沿用暂时贡献，不永久清掉敌方的降阶——窗口一收只收回本招份额，原来的负项原样保留。
 *
 * 近身契约：执行时再次核对真实距离与接触——目标走开、中间隔墙都按空放收手，绝不隔空点穴、不穿墙摸人。
 * 穴点由受术者的朝向与体型构造，准备时先亮候选穴点，真正触达后才点亮被点中的那处。
 */
namespace PokemonSkills {
    const acupressureScene = "world_combat:move_acupressure";
    const acupressureFlow = "world_combat:acupressure_flow";
    const acupressureContribution = "world_combat:move/acupressure";
    /** 共享七项能力阶梯；每一类对任意战斗者都有已声明的消费者（六维投影 / 共享命中模型）。 */
    const acupressureStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];
    /** 表现里的参考半径：`data.scale = 实际点穴距离 / 这个数`。 */
    const acupressureReference = 2.0;
    /** 抽中项对应身上固定的一处小穴点，按 [前, 右, 上] 相对半宽/半高的分量表达，客户端用受术者锚点换算世界点。 */
    const acupressureSites: { [stat: string]: number[] } = {
        atk: [0.70, 0.45, 0.10],
        def: [0.60, -0.50, -0.10],
        spa: [0.40, 0.45, 0.65],
        spd: [0.40, -0.50, 0.60],
        spe: [0.80, 0.20, -0.60],
        accuracy: [0.30, 0.15, 0.95],
        evasion: [0.10, 0.85, 0.30]
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
    function acupressureSite(stat: string): number[] {
        return acupressureSites[stat] || acupressureSites.atk;
    }

    /** 目标身上可点的那几项（未满 +6）。 */
    function acupressureOpen(world: CombatWorld, target: CombatActor): string[] {
        const open: string[] = [];
        for (let index = 0; index < acupressureStats.length; index++) {
            if (NativeEffects.effectiveStage(world, target, acupressureStats[index]) < 6) open.push(acupressureStats[index]);
        }
        return open;
    }
    /** 当前有效等级最低的一项；有负项时只在这些负项之间平局随机，否则在全部未满项里随机。 */
    function acupressureChoose(world: CombatWorld, target: CombatActor): string | null {
        const open = acupressureOpen(world, target);
        if (open.length === 0) return null;
        let lowest = 0, weakest: string[] = [];
        for (let index = 0; index < open.length; index++) {
            const stage = NativeEffects.effectiveStage(world, target, open[index]);
            if (stage < lowest) { lowest = stage; weakest = [open[index]]; }
            else if (stage === lowest && stage < 0) weakest.push(open[index]);
        }
        const pool = weakest.length > 0 ? weakest : open;
        return pool[Math.max(0, Math.min(pool.length - 1, Math.floor(world.random() * pool.length)))];
    }
    /** 准备期先亮起的候选穴点：有负项只亮负项，否则亮全部未满项。 */
    function acupressureCandidates(world: CombatWorld, target: CombatActor): string[] {
        const open = acupressureOpen(world, target);
        const negative: string[] = [];
        for (let index = 0; index < open.length; index++) {
            if (NativeEffects.effectiveStage(world, target, open[index]) < 0) negative.push(open[index]);
        }
        return negative.length > 0 ? negative : open;
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
        description: "贴近给自己或近处伙伴点穴：先找当前被压低得最狠的一项能力，把它补 1 到 2 级（可越过 0，不超过 +6）；没有负项才在未满项里随机点。一轮只点一项，通畅结束或被清除时只收回该项贡献，原来的削弱原样保留。目标走开或隔墙都按空放。",
        uses: ["把伙伴被削掉的关键能力托回来", "交战前为自己点一项尚未满的能力", "安全时用稳按取得两级强化"],
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
            const world = action.sense(), target = acupressureTarget(action, config);
            const data: any = { moment: "seek", target: target === null ? "" : String(target.ref()),
                steady: config && config.steady === true ? 1 : 0, start: world.tick(), duration: prepare, sites: [] };
            if (target !== null && world.valid(target)) {
                const candidates = acupressureCandidates(world, target);
                for (let index = 0; index < candidates.length; index++) {
                    const site = acupressureSite(candidates[index]);
                    data.sites.push({ stat: candidates[index], f: site[0], r: site[1], u: site[2] });
                }
            }
            action.present("world_combat:move_acupressure:seek", acupressureScene, 1, action.origin(), JSON.stringify(data));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = acupressureTarget(action, config);
            if (target === null || !world.valid(target) || !world.friendly(target)) { done(action); return; }
            if (MobEffects.read(world, target, acupressureFlow)) { done(action); return; }
            // 真实近身接触：跑开、隔墙都按空放，不隔空点穴。
            if (!acupressureTouch(action, target)) { done(action); return; }
            const stat = acupressureChoose(world, target);
            if (stat === null) { done(action); return; }
            const pressed = world.observe(target), body = world.observe(actor);
            if (pressed === null || body === null) { done(action); return; }
            const steady = !!(config && config.steady === true);
            const press = Math.max(1, Math.min(2, Math.round(p("acupressure", "press", action))));
            const window = Math.max(120, Math.round(p("acupressure", "window", action)));
            const reach = Math.max(1.0, p("acupressure", "reach", action));
            const motes = Math.max(10, Math.round(p("acupressure", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("acupressure", "beats", action))));
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
            const site = acupressureSite(stat);
            const data = { moment: "press", target: String(target.ref()), stat: stat, index: index, press: levels,
                motes: motes, beats: beats, scale: scale, steady: steady ? 1 : 0, f: site[0], r: site[1], u: site[2],
                start: world.tick(), intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) };
            WorldFeedback.emit(world, acupressureScene, 1, pressed.position(), data, 30);
            // 通畅期间只在被点中的穴道留一枚小点；窗口到期、被清除或刷新时随窗口一起收。
            WorldFeedback.onEffect(world, windowId, "world_combat:move_acupressure/flow", acupressureScene, 1, pressed.position(),
                { moment: "flow", target: String(target.ref()), stat: stat, index: index, motes: Math.max(8, Math.round(motes / 3)),
                    scale: scale, f: site[0], r: site[1], u: site[2] });
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
            { moment: "fade", target: String(target.ref()), start: world.tick() }, 22);
    });
}
