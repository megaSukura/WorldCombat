/**
 * 缩入壳中 / withdraw — 执行组织。
 *
 * 核心念头：真的把身体收进壳里、合上。壳合上的一刻你钉在原地不动，壳面按次替你把来袭整个挡下来——
 *   挡几下就裂；想再动，得等壳松开。它是本族里唯一放弃移动的一招。
 *
 * 两幕：
 *   收（windup 播「收身」，提交前只观察与预告，打断不花代价）。
 *   壳（提交后）：NativeEffects.boostWindow 写入公共能力阶梯，挂上共享身份
 *     world_combat:status/withdraw 的壳窗口；用世界已有的 world_combat:rooted 把施法者钉住；
 *     再给一层按次整个挡伤的 GuardEffects 池（挡满 blocks 次即裂）。
 * 结束：壳挡满、被清除或到期时，GuardEffects 池结束、rooted 解除、记下的涨身窗口一并结束、等级随窗口收回。
 */
namespace PokemonSkills {
    const withdrawScene = "world_combat:move_withdraw";
    const withdrawShell = "world_combat:withdraw_shell";
    const withdrawMark = "world_combat:withdraw_mark";
    const withdrawRule = "world_combat:withdraw";
    const withdrawSealText = "world_combat.move.withdraw.text.seal";
    const withdrawOpenText = "world_combat.move.withdraw.text.open";
    const withdrawBlockText = "world_combat.move.withdraw.text.block";
    /** 表现里的参考半径：`data.scale = 实际壳半径 / 这个数`。 */
    const withdrawReferenceRadius = 1.3;

    // 记号：只记这次壳窗口的 id；窗口结束时按 id 提前结束它。
    WorldCombat.effect(withdrawMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.window !== "number" || !isFinite(value.window)) throw new Error("Invalid withdraw mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(withdrawMark, "start", function () { });

    // 壳的按次硬挡：只截敌对来源，每挡一次 left 减一，挡满即裂并结束壳窗口。
    GuardEffects.register(withdrawRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const plates = Math.max(6, Math.round(Number((<any>state).plates) || 12));
            const scale = Math.max(0.4, Number((<any>state).scale) || 1);
            const left = Math.max(0, Math.round(Number((<any>state).left) || 0));
            WorldFeedback.keep(world, "withdraw:shell:" + String(effect.target().ref()), withdrawScene, 1, body.position(),
                { moment: "hollow", actor: String(effect.target().ref()), plates: plates, left: left, scale: scale }, 20);
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, _incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            custom.left = Math.max(0, Math.round(Number(custom.left) || 0) - 1);
            effect.state(JSON.stringify(custom));
            const plates = Math.max(6, Math.round(Number(custom.plates) || 12));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            WorldFeedback.emit(world, withdrawScene, 1, body.position(),
                { moment: "block", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                    left: custom.left, plates: plates, scale: scale,
                    intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), withdrawBlockText, [custom.left], 22);
            world.sound("minecraft:block.slime_block.hit", body.position(), 12, "{}");
            if (custom.left <= 0) {
                const shell = MobEffects.read(world, target, withdrawShell);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function withdrawStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }


    define({
        id: "withdraw",
        cooldownParameter: "wait",
        name: "缩入壳中",
        description: "提高防御并获得可阻挡数次攻击的保护，期间无法移动。",
        uses: ["硬吃一轮爆发：把身体收进壳里，让壳按次挡下来袭", "被集火时钉住不动，用壳的次数换队友的时间", "用一次短窗口把防御抬起来再探出去打"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 5,
        cooldown: 110,
        style: "shell",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 12, panic: 0.5 } },
        fields: [flag("deep", "深潜")],
        indicator: function (config, pokemon) {
            return { radius: p("withdraw", "shell", pokemon), geometry: "area", style: "shell", color: 0x4C7FA8,
                label: config && config.deep === true ? "缩入壳中 · 深潜" : "缩入壳中 · 浅缩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["withdraw"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("withdraw", "tempo", context)),
                recover: Math.round(p("withdraw", "aftercast", context)),
                cooldown: Math.round(p("withdraw", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_withdraw:tuck", withdrawScene, 1, action.origin(),
                JSON.stringify({ moment: "tuck", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(1, Math.round(p("withdraw", "gift", action))));
            const blocks = Math.max(1, Math.min(3, Math.round(p("withdraw", "blocks", action))));
            const window = Math.max(60, Math.round(p("withdraw", "window", action)));
            const shell = Math.max(0.6, p("withdraw", "shell", action));
            const plates = Math.max(8, Math.round(p("withdraw", "plates", action)));
            const scale = shell / withdrawReferenceRadius;
            const beforeDef = withdrawStage(world, actor, "def");
            const windowId = NativeEffects.boostWindow(world, actor, { def: gift }, window, "withdraw");
            const levels = Math.max(0, withdrawStage(world, actor, "def") - beforeDef);
            MobEffects.apply(world, actor, withdrawShell, window, levels);
            world.effect(withdrawMark, actor, JSON.stringify({ window: windowId }), window);
            WorldEffects.apply(world, actor, "rooted", {}, window);
            GuardEffects.apply(world, actor, { rule: withdrawRule, mode: "pool", capacity: 1000000000, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, left: blocks, plates: plates, scale: scale } as any, window);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, withdrawScene, 1, feet,
                { moment: "seal", actor: String(actor.ref()), levels: levels, blocks: blocks, plates: plates, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, plates / 20 + blocks * 0.15)) }, 32);
            WorldFeedback.keep(world, "withdraw:shell:" + String(actor.ref()), withdrawScene, 1, body.position(),
                { moment: "hollow", actor: String(actor.ref()), plates: plates, left: blocks, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawSealText,
                [levels, blocks], 30);
            world.sound("minecraft:item.armor.equip_turtle", body.position(), 16, "{}");
            world.sound("cobblemon:move.withdraw.actor", body.position(), 14, "{}");
            done(action);
        }
    });

    // 壳挡满、被清除或到期：结束按次硬挡池、解除钉住、收回抬起的等级。
    WorldCombat.on("world_combat:move_withdraw/open", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== withdrawShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === withdrawRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        const roots = world.effects(actor, "world_combat:rooted");
        for (let j = 0; j < roots.length; j++) {
            if (String(roots[j].source().ref()) === String(actor.ref())) world.operation(roots[j].id(), "world_combat:dispel", "{}");
        }
        const marks = world.effects(actor, withdrawMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.window === "number") NativeEffects.windowClose(world, mark.window);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, withdrawScene, 1, body.position(), { moment: "open", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawOpenText, [], 24);
        world.sound("minecraft:entity.turtle.shamble", body.position(), 12, "{}");
    });
}
