/**
 * 变硬 / harden — 执行组织。
 *
 * 核心念头：皮肤表面析出一层脆硬的晶壳。硬得能把每一击磨钝一点，可也脆——一记够重的攻击会把整层壳一次打裂。
 *
 * 两幕：
 *   凝（windup 播「结晶」，提交前只观察与预告，打断不花代价）。
 *   硬（提交后）：NativeEffects.boostWindow 写入公共能力阶梯，窗口归属这层壳载体本身
 *     （到期／被打裂／被清除只收回本次实际贡献）；挂上共享身份 world_combat:status/harden 的晶壳窗口；
 *     同时给一层按比例削伤的 GuardEffects 池（每击磨掉一部分），但单次攻击达到最大生命的 crack 比例时晶壳一次打裂。
 * 载体口径：等级窗口与削伤池都绑定「最后一次应用」的壳载体锚，先确定最终 carrier 再交给两者；没有 carrier 时不建孤立护层。
 *   碎壳比较的是**原始来伤** incoming.amount，削掉的量只作受击反馈，所以声明多少阈值就是多少，不会被削伤比例放大。
 * 结束：晶壳被打裂、被清除或到期时，GuardEffects 池结束、窗口随载体收回、等级一并收回。
 *   每条 guard 记下自己那层壳载体的锚点，壳一走这条池自己结束——重放只维护一份壳。
 */
namespace PokemonSkills {
    const hardenScene = "world_combat:move_harden";
    const hardenShellScene = "world_combat:move_harden_shell";
    const hardenCrackScene = "world_combat:move_harden_crack";
    const hardenShell = "world_combat:harden_shell";
    const hardenRule = "world_combat:harden";
    const hardenContribution = "world_combat:move/harden";
    const hardenClenchText = "world_combat.move.harden.text.clench";
    const hardenShatterText = "world_combat.move.harden.text.shatter";
    /** 表现里的参考半径：`data.scale = 实际晶壳半径 / 这个数`。 */
    const hardenReferenceRadius = 1.1;

    function hardenClamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 真实的来袭接触侧：有真实弹体轨迹时取最后一段落点；否则用原生来源点求被击者真实 AABB 表面。
     * 来源只决定入射方向，绝不把来源点本身当作受击面；没有可读来源时返回 null，只画受保护者局部中性裂纹。
     */
    function hardenContact(world: CombatWorld, target: CombatActor, incoming: GuardEffects.Incoming): CombatPoint | null {
        const data = incoming.data;
        if (data && data.directProjectile === true) {
            const path = Array.isArray(data.projectilePath) ? data.projectilePath : [];
            for (let index = path.length - 1; index >= 0; index--) {
                const to = path[index] ? path[index].to : null;
                if (Array.isArray(to) && to.length === 3
                    && typeof to[0] === "number" && typeof to[1] === "number" && typeof to[2] === "number")
                    return WorldCombat.point(to[0], to[1], to[2]);
            }
        }
        const from = hardenSourcePoint(world, incoming);
        return from === null ? null : world.closestPoint(target, from);
    }

    /** 来袭来源点：原生 sourcePosition，缺省时退回来源身体位置；都没有就不给方向，不捏造坐标。 */
    function hardenSourcePoint(world: CombatWorld, incoming: GuardEffects.Incoming): CombatPoint | null {
        const source = incoming.data ? incoming.data.sourcePosition : null;
        if (Array.isArray(source) && source.length === 3
            && typeof source[0] === "number" && typeof source[1] === "number" && typeof source[2] === "number")
            return WorldCombat.point(source[0], source[1], source[2]);
        const attacker = incoming.source ? world.observe(incoming.source) : null;
        return attacker === null ? null : attacker.position();
    }

    // 晶壳的削伤池：按比例磨掉每一击；单次攻击够重就把壳一次打裂。画面绑在这条池上，随它存续、随它收。
    GuardEffects.register(hardenRule, {
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            const custom: any = state;
            // 壳载体已换／已消失：这条池不是当前实例，自己结束，避免留壳。
            if (custom.carrier && !MobEffects.matches(world, effect.target(), custom.carrier)) { effect.end(); return; }
            const facets = Math.max(6, Math.round(Number(custom.facets) || 14));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * hardenReferenceRadius);
            WorldFeedback.onEffect(world, effect.id(), "harden:shell:" + effect.id(), hardenShellScene, 1, body.position(),
                { actor: String(effect.target().ref()), facets: facets, scale: scale, radius: radius });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const crack = hardenClamp(Number(custom.crack) || 0.16, 0.05, 0.5);
            const facets = Math.max(6, Math.round(Number(custom.facets) || 14));
            const scale = Math.max(0.4, Number(custom.scale) || 1);
            const radius = Math.max(0.4, Number(custom.radius) || scale * hardenReferenceRadius);
            const threshold = Math.max(1, body.maxHealth() * crack);
            // 阈值按原始来伤比较：声明多少就是多少，不被这一层削掉的比例放大。削掉的量只作受击反馈。
            const incomingAmount = Math.max(0, Number(incoming.amount) || 0);
            const depth = hardenClamp(incomingAmount / threshold, 0, 1);
            const heavy = incomingAmount >= threshold;
            const contact = hardenContact(world, target, incoming);
            const data: any = { moment: "crack", actor: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                heavy: heavy ? 1 : 0, depth: Math.round(depth * 100) / 100,
                facets: facets, scale: scale, radius: radius };
            if (contact !== null) {
                data.point = [contact.x(), contact.y(), contact.z()];
                const away = contact.minus(body.position());
                if (away.length() > 0.01) { const unit = away.unit(); data.direction = [unit.x(), unit.y(), unit.z()]; }
            }
            // 每一下都在真实来袭接触侧留一道局部短裂纹与裂光；只有达到真实阈值的那一击才碎片剥落（见 shatter）。
            WorldFeedback.emit(world, hardenCrackScene, 1, body.position(), data, 20);
            // 小击只局部轻响；达到阈值的那一击在同一受击面裂开整壳。
            world.sound(heavy ? "minecraft:block.amethyst_block.break" : "minecraft:block.amethyst_block.resonate",
                body.position(), heavy ? 14 : 10, "{}");
            if (heavy) {
                WorldFeedback.emit(world, hardenScene, 1, body.position(),
                    { moment: "shatter", actor: String(target.ref()), direction: data.direction, facets: facets, scale: scale }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), hardenShatterText, [], 24);
                world.sound("minecraft:block.glass.break", body.position(), 14, "{}");
                const shell = MobEffects.read(world, target, hardenShell);
                if (shell !== null) world.removeMobEffect(target, shell.id(), shell.key());
            }
        }
    });

    define({
        id: "harden",
        cooldownParameter: "wait",
        name: "变硬",
        description: "提高防御，减轻受击伤害。承受重击时保护可能提前破裂。",
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
            const temper = hardenClamp(p("harden", "temper", action), 0.05, 0.6);
            const crack = hardenClamp(p("harden", "crack", action), 0.05, 0.5);
            const facets = Math.max(8, Math.round(p("harden", "facets", action)));
            const shell = Math.max(0.5, p("harden", "shell", action));
            const scale = shell / hardenReferenceRadius;
            // 已有壳不叠放：先收掉本招旧池；窗口与池随载体结束，只维护一份壳。
            const guards = world.effects(actor, "world_combat:guard");
            for (let i = 0; i < guards.length; i++) {
                const state = JSON.parse(String(guards[i].data()));
                if (state.rule === hardenRule) world.operation(guards[i].id(), "world_combat:dispel", "{}");
            }
            const before = NativeEffects.effectiveStage(world, actor, "def");
            const previous = MobEffects.read(world, actor, hardenShell);
            const carrier = MobEffects.apply(world, actor, hardenShell, window, previous ? previous.amplifier() : 0);
            // 没有载体就不建孤立护层，也不播成功回执：施法者此刻不再可写。
            if (!carrier) { done(action); return; }
            NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), hardenContribution, carrier, previous);
            const levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
            // 等级展示需要把壳的 amplifier 调到本次实际抬起的级数：这会落地成一次新载体，
            // 于是先确定这最后一次应用的 carrier，再把同一锚同时交给等级窗口与护层，避免护层仍指向失效的旧 revision。
            let active = carrier;
            if (active.amplifier() !== levels) {
                const shown = MobEffects.apply(world, actor, hardenShell, window, levels);
                if (shown) { NativeEffects.boostWindow(world, actor, {}, shown.duration(), hardenContribution, shown, carrier); active = shown; }
            }
            const guardId = GuardEffects.apply(world, actor, { rule: hardenRule, mode: "pool", capacity: 1000000000, fraction: temper,
                minimumHealth: 0, charges: 0, linkRange: 0, crack: crack, facets: facets, scale: scale, radius: shell,
                carrier: MobEffects.anchor(active) } as any, active.duration());
            // 晶壳持续读数的表现绑在真实护层上，随它存续、随它收。
            if (guardId) WorldFeedback.onEffect(world, guardId, "harden:shell:" + guardId, hardenShellScene, 1, body.position(),
                { actor: String(actor.ref()), facets: facets, scale: scale, radius: shell });
            WorldFeedback.emit(world, hardenScene, 1, body.position(),
                { moment: "crystal", actor: String(actor.ref()), levels: levels, temper: temper, crack: crack,
                    facets: facets, scale: scale, intensity: Math.max(0.8, Math.min(2, facets / 18)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), hardenClenchText,
                [levels, Math.round(temper * 100)], 30);
            world.sound("minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
            done(action);
        }
    });

    // 晶壳被打裂、被清除或到期：只收掉绑定这层壳载体的 guard 池；窗口与等级随载体自行收回。
    WorldCombat.on("world_combat:move_harden/shatter", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hardenShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            const state = JSON.parse(String(guards[i].data()));
            if (state.rule === hardenRule && state.carrier && state.carrier.id === hardenShell
                && !MobEffects.matches(world, actor, state.carrier))
                world.operation(guards[i].id(), "world_combat:dispel", "{}");
        }
        // 被打裂或被清除的当刻已在 guarded 里放过表现；这里只为自然到期补一次崩落。
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, hardenScene, 1, body.position(), { moment: "shatter", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), hardenShatterText, [], 24);
        world.sound("minecraft:block.glass.break", body.position(), 12, "{}");
    });
}
