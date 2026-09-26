/**
 * 缩入壳中 / withdraw — 执行组织。
 *
 * 核心念头：真的把身体收进壳里、合上。壳合上的一刻你钉在原地不动，壳面按次替你把来袭整个挡下来——
 *   挡几下就裂；想再动，得等壳松开。它是本族里唯一放弃移动的一招。
 *
 * 两幕：
 *   收（windup 播「收身」，提交前只观察与预告，打断不花代价）。
 *   壳（提交后）：NativeEffects.boostWindow 把防御挂到共享身份 world_combat:status/withdraw 的壳窗口上，
 *     窗口归属这层壳载体本身；再用世界已有的 world_combat:rooted 把施法者钉住，并保存这条 root 的实例 id，
 *     开壳时只解除本招自己那一条；再给一层按次整个挡伤的 GuardEffects 池（挡满 blocks 次即裂）。
 * 结束：壳挡满、被清除或到期时，GuardEffects 池结束、按实例 id 解除本招 root、窗口随载体收回、等级一并收回。
 *   壳上只画真实剩余的 1–3 枚大壳瓣，每挡下一次少一枚。
 */
namespace PokemonSkills {
    const withdrawScene = "world_combat:move_withdraw";
    const withdrawShellScene = "world_combat:move_withdraw_shell";
    const withdrawShell = "world_combat:withdraw_shell";
    const withdrawMark = "world_combat:withdraw_mark";
    const withdrawRule = "world_combat:withdraw";
    const withdrawContribution = "world_combat:move/withdraw";
    const withdrawSealText = "world_combat.move.withdraw.text.seal";
    const withdrawOpenText = "world_combat.move.withdraw.text.open";
    const withdrawBlockText = "world_combat.move.withdraw.text.block";
    /** 表现里的参考半径：`data.scale = 实际壳半径 / 这个数`。 */
    const withdrawReferenceRadius = 1.3;

    /** 真实的来袭接触侧：原生 sourcePosition；缺省时退回来源身体位置；都没有就不给方向，不捏造坐标。 */
    function withdrawContact(world: CombatWorld, target: CombatActor, incoming: GuardEffects.Incoming): CombatPoint | null {
        const source = incoming.data ? incoming.data.sourcePosition : null;
        if (Array.isArray(source) && source.length === 3
            && typeof source[0] === "number" && typeof source[1] === "number" && typeof source[2] === "number")
            return WorldCombat.point(source[0], source[1], source[2]);
        const attacker = incoming.source ? world.observe(incoming.source) : null;
        return attacker === null ? null : attacker.position();
    }

    // 记号：只记本次 root 的实例 id；壳开时按 id 结束本招自己的定身，不动同来源别的根。
    WorldCombat.effect(withdrawMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (value.root !== undefined && (typeof value.root !== "number" || !isFinite(value.root) || value.root < 0))
            throw new Error("Invalid withdraw mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(withdrawMark, "start", function () { });

    // 壳的按次硬挡：只截敌对来源的攻击，每挡一次原生 charges 减一，挡满即裂并结束壳窗口。
    GuardEffects.register(withdrawRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref()) || world.friendly(incoming.source)) return false;
            return DamageSemantics.read(incoming.data).attack || String(incoming.data.kind) === "move";
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            // 壳载体已换／已消失：这条池不是当前实例，自己结束，避免留壳。
            if (custom.carrier && !MobEffects.matches(world, effect.target(), custom.carrier)) { effect.end(); return; }
            const left = Math.max(0, Math.round(state.charges));
            const blocks = Math.max(1, Math.round(Number(custom.blocks) || left || 1));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * withdrawReferenceRadius);
            WorldFeedback.onEffect(world, effect.id(), "withdraw:petals:" + effect.id(), withdrawShellScene, 1, body.position(),
                { moment: "shell", actor: String(effect.target().ref()), blocks: blocks, left: left, radius: radius, scale: scale });
            WorldFeedback.onEffect(world, effect.id(), "withdraw:sheen:" + effect.id(), withdrawScene, 1, body.position(),
                { moment: "hollow", actor: String(effect.target().ref()), blocks: blocks, left: left, scale: scale });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const left = Math.max(0, Math.round(state.charges));
            const blocks = Math.max(1, Math.round(Number(custom.blocks) || left || 1));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * withdrawReferenceRadius);
            const data: any = { moment: "block", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                left: left, blocks: blocks, scale: scale,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            const contact = withdrawContact(world, target, incoming);
            if (contact !== null) {
                const away = contact.minus(body.position());
                if (away.length() > 0.01) { const unit = away.unit(); data.direction = [unit.x(), unit.y(), unit.z()]; }
            }
            WorldFeedback.emit(world, withdrawScene, 1, body.position(), data, 22);
            // 剩几枚画几枚：这一次消费后立刻更新壳面。
            WorldFeedback.onEffect(world, effect.id(), "withdraw:petals:" + effect.id(), withdrawShellScene, 1, body.position(),
                { moment: "shell", actor: String(target.ref()), blocks: blocks, left: left, radius: radius, scale: scale });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), withdrawBlockText, [left], 22);
            world.sound("minecraft:block.slime_block.hit", body.position(), 12, "{}");
            if (left <= 0) {
                const shell = MobEffects.read(world, target, withdrawShell);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    /** 收掉本招上一份壳池与定身：重放只维护一份壳，也不会把别的来源的根一起清掉。 */
    function withdrawPurge(world: CombatWorld, actor: CombatActor): void {
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === withdrawRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        const marks = world.effects(actor, withdrawMark);
        for (let i = 0; i < marks.length; i++) {
            const state = JSON.parse(String(marks[i].data()));
            if (typeof state.root === "number" && state.root > 0) world.operation(state.root, "world_combat:dispel", "{}");
            world.operation(marks[i].id(), "world_combat:dispel", "{}");
        }
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
            const scale = shell / withdrawReferenceRadius;
            // 已有壳不叠放：先收掉本招旧池与旧定身，只维护一份壳。
            withdrawPurge(world, actor);
            const before = NativeEffects.effectiveStage(world, actor, "def");
            const previous = MobEffects.read(world, actor, withdrawShell);
            const carrier = MobEffects.apply(world, actor, withdrawShell, window, previous ? previous.amplifier() : 0);
            const ticks = carrier ? carrier.duration() : window;
            let levels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), withdrawContribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
                if (carrier.amplifier() !== levels) {
                    const shown = MobEffects.apply(world, actor, withdrawShell, window, levels);
                    if (shown) NativeEffects.boostWindow(world, actor, {}, shown.duration(), withdrawContribution, shown, carrier);
                }
            }
            // 定身是本招自己的实例：记下 id，开壳时只解除这一条，不碰同来源别的根。
            const rootId = world.effect("world_combat:rooted", actor, "{}", ticks);
            world.effect(withdrawMark, actor, JSON.stringify({ root: rootId }), ticks);
            GuardEffects.apply(world, actor, { rule: withdrawRule, mode: "ward", capacity: 0, fraction: 1,
                minimumHealth: 0, charges: blocks, linkRange: 0, blocks: blocks, scale: scale, radius: shell,
                carrier: carrier ? MobEffects.anchor(carrier) : undefined } as any, ticks);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, withdrawScene, 1, feet,
                { moment: "seal", actor: String(actor.ref()), levels: levels, blocks: blocks, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, 0.5 + blocks * 0.3)) }, 32);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawSealText,
                [levels, blocks], 30);
            world.sound("minecraft:item.armor.equip_turtle", body.position(), 16, "{}");
            world.sound("cobblemon:move.withdraw.actor", body.position(), 14, "{}");
            done(action);
        }
    });

    // 壳挡满、被清除或到期：结束本招池、按实例 id 解除本招 root、收回抬起的等级。
    WorldCombat.on("world_combat:move_withdraw/open", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== withdrawShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／换壳：已换成同一次施放的新壳，不当作开壳。
        if (MobEffects.read(world, actor, withdrawShell) !== null) return;
        withdrawPurge(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, withdrawScene, 1, body.position(), { moment: "open", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), withdrawOpenText, [], 24);
        world.sound("minecraft:entity.turtle.shamble", body.position(), 12, "{}");
    });
}
