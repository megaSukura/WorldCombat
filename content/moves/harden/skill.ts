/**
 * 变硬 / harden — 执行组织。
 *
 * 核心念头：皮肤表面析出一层脆硬的晶壳。硬得能把每一击磨钝一点，可也脆——一记够重的攻击会把整层壳一次打裂。
 *
 * 两幕：
 *   凝（windup 播「结晶」，提交前只观察与预告，打断不花代价）。
 *   硬（提交后）：NativeEffects.boostWindow 写入公共能力阶梯，挂上共享身份
 *     world_combat:status/harden 的晶壳窗口；同时给一层按比例削伤的 GuardEffects 池（每击磨掉一部分），
 *     但单次攻击达到最大生命的 crack 比例时晶壳一次打裂、窗口提前结束。
 * 结束：晶壳被打裂、被清除或到期时，GuardEffects 池结束、记下的涨身窗口一并结束、等级随窗口收回。
 */
namespace PokemonSkills {
    const hardenScene = "world_combat:move_harden";
    const hardenShell = "world_combat:harden_shell";
    const hardenMark = "world_combat:harden_mark";
    const hardenRule = "world_combat:harden";
    const hardenClenchText = "world_combat.move.harden.text.clench";
    const hardenShatterText = "world_combat.move.harden.text.shatter";
    /** 表现里的参考半径：`data.scale = 实际晶壳半径 / 这个数`。 */
    const hardenReferenceRadius = 1.1;

    // 记号：只记这次晶壳窗口的 id；窗口结束时按 id 提前结束它。
    WorldCombat.effect(hardenMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.window !== "number" || !isFinite(value.window)) throw new Error("Invalid harden mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(hardenMark, "start", function () { });

    // 晶壳的削伤池：按比例磨掉每一击；单次攻击够重就把壳一次打裂。
    GuardEffects.register(hardenRule, {
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const facets = Math.max(6, Math.round(Number((<any>state).facets) || 14));
            const scale = Math.max(0.4, Number((<any>state).scale) || 1);
            WorldFeedback.keep(world, "harden:shell:" + String(effect.target().ref()), hardenScene, 1, body.position(),
                { moment: "shell", actor: String(effect.target().ref()), facets: facets, scale: scale }, 20);
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const crack = Math.max(0.05, Number((<any>state).crack) || 0.16);
            const facets = Math.max(6, Math.round(Number((<any>state).facets) || 14));
            const scale = Math.max(0.4, Number((<any>state).scale) || 1);
            const heavy = incoming.amount >= body.maxHealth() * crack;
            WorldFeedback.emit(world, hardenScene, 1, body.position(),
                { moment: "crack", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                    heavy: heavy ? 1 : 0, facets: facets, scale: scale,
                    intensity: Math.max(0.6, Math.min(2, incoming.amount / Math.max(1, body.maxHealth() * crack))) }, 20);
            world.sound("minecraft:block.amethyst_block.resonate", body.position(), 12, "{}");
            if (heavy) {
                const shell = MobEffects.read(world, target, hardenShell);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function hardenStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }


    define({
        id: "harden",
        cooldownParameter: "wait",
        name: "变硬",
        description: "全身使劲，让身体变硬，从而提高自己的防御。",
        uses: ["预料到一轮爆发前先结晶，把每一击磨钝", "用便宜的窗口反复补壳，和对手换血", "在细碎连打里站住——只怕一下够狠的重击"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 100,
        style: "crystal",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, panic: 0.55 } },
        fields: [flag("deep", "深硬化")],
        indicator: function (config, pokemon) {
            return { radius: p("harden", "shell", pokemon), geometry: "area", style: "crystal", color: 0xCFE8E4,
                label: config && config.deep === true ? "变硬 · 深硬化" : "变硬 · 浅硬化" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["harden"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("harden", "tempo", context)),
                recover: Math.round(p("harden", "aftercast", context)),
                cooldown: Math.round(p("harden", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_harden:clench", hardenScene, 1, action.origin(),
                JSON.stringify({ moment: "clench", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(1, Math.round(p("harden", "gift", action))));
            const window = Math.max(80, Math.round(p("harden", "window", action)));
            const temper = Math.max(0.05, Math.min(0.6, p("harden", "temper", action)));
            const crack = Math.max(0.05, Math.min(0.5, p("harden", "crack", action)));
            const facets = Math.max(8, Math.round(p("harden", "facets", action)));
            const shell = Math.max(0.5, p("harden", "shell", action));
            const scale = shell / hardenReferenceRadius;
            const beforeDef = hardenStage(world, actor, "def");
            const windowId = NativeEffects.boostWindow(world, actor, { def: gift }, window, "harden");
            const levels = Math.max(0, hardenStage(world, actor, "def") - beforeDef);
            MobEffects.apply(world, actor, hardenShell, window, levels);
            world.effect(hardenMark, actor, JSON.stringify({ window: windowId }), window);
            GuardEffects.apply(world, actor, { rule: hardenRule, mode: "pool", capacity: 1000000000, fraction: temper,
                minimumHealth: 0, charges: 0, linkRange: 0, crack: crack, facets: facets, scale: scale } as any, window);
            WorldFeedback.emit(world, hardenScene, 1, body.position(),
                { moment: "crystal", actor: String(actor.ref()), levels: levels, temper: temper, crack: crack,
                    facets: facets, scale: scale, intensity: Math.max(0.8, Math.min(2, facets / 18)) }, 30);
            WorldFeedback.keep(world, "harden:shell:" + String(actor.ref()), hardenScene, 1, body.position(),
                { moment: "shell", actor: String(actor.ref()), facets: facets, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), hardenClenchText,
                [levels, Math.round(temper * 100)], 30);
            world.sound("minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
            done(action);
        }
    });

    // 晶壳被打裂、被清除或到期：结束同一层的削伤池，收回抬起的等级。
    WorldCombat.on("world_combat:move_harden/shatter", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hardenShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === hardenRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        const marks = world.effects(actor, hardenMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.window === "number") NativeEffects.windowClose(world, mark.window);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, hardenScene, 1, body.position(), { moment: "shatter", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), hardenShatterText, [], 24);
        world.sound("minecraft:block.glass.break", body.position(), 14, "{}");
    });
}
