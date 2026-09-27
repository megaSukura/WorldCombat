/**
 * 快速防守 / quickguard — 执行组织与结算。
 *
 * 核心念头：抢在对手的下一手之前架起一面极短的快板，替自己与身边的队友各自接住第一记敌方直击，
 *   有界地削掉它，随即那块板碎掉——一人一次的快拍，不是按总量磨穿的护盾。
 *
 * 两幕：
 *   沉（windup 播「按地聚板」，提交前只观察与预告，打断不花代价）。
 *   张（提交后）：施法者与半径内的友方各挂共享身份 world_combat:status/quickguard 的真实 MobEffect，
 *     并各自领到一层共享 GuardEffects 的 pool（规则 world_combat:move_quickguard）：只截敌方
 *     DamageSemantics.directOffense（原生近战、弹丸与真实伤害招式；排残伤、环境与自费），
 *     按来伤的 60% 减免、以 capacity 为单次减免上限，命中一次即消耗该人的板并让身份消失。
 * 持续：快板存在 window 刻（抢拍 8／稳架 12）；板边随剩余时间收缩，实际受击点闪碎一次。
 * 结束：某人的板接住第一记直击即消耗；或到时由原生效果时钟收回，身份与画面一起收起。
 *   离开施法者太远或失去视线的人随共享连接的判定断开而失去。
 * 先制提示：本单元仍观察敌人是否真的出手过优先度大于 0 的招式（只写自己的表、不碰世界），
 *   作为 AI 的强提示，而不是这面快板能生效的前置条件。
 */
namespace PokemonSkills {
    const quickGuardScene = "world_combat:move_quickguard";
    const quickGuardHoldScene = "world_combat:move_quickguard_hold";
    const quickGuardEffect = "world_combat:quick_guard";
    const quickGuardRule = "world_combat:move_quickguard";
    const quickGuardRaiseText = "world_combat.move.quickguard.text.raise";
    const quickGuardBlockText = "world_combat.move.quickguard.text.block";
    const quickGuardFallText = "world_combat.move.quickguard.text.fall";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const quickGuardReferenceRadius = 3.2;
    /** 观察到的敌方先制出手：攻击者 ref -> 最近一次 priority>0 出手的 tick。AI 的「已有先制行为」判据。 */
    const quickGuardPriority: { [ref: string]: number } = Object.create(null);
    /** 攻击者在 maxAge 刻内是否真的出手过先制招式。 */
    export function quickGuardPrioritySeen(ref: string, tick: number, maxAge: number): boolean {
        const at = quickGuardPriority[ref];
        return at !== undefined && tick - at <= maxAge;
    }

    // 快板的结算点：只截敌方直击，按来伤的 60% 减免、以 capacity 为上限，命中一次即消耗该人的板。
    GuardEffects.register(quickGuardRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            return DamageSemantics.directOffense(incoming.data);
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target();
            // 身份被人清掉时，池也一并收；这就是「解除」的路。
            if (MobEffects.read(world, target, quickGuardEffect) === null) { effect.end(); return; }
            const body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            // 收缩的倒计时板边绑在这层真实的 pool 上：板被接住消耗、身份被清或连接断开时随它一起收。
            WorldFeedback.onEffect(world, effect.id(), "quickguard:hold:" + String(target.ref()), quickGuardHoldScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), start: custom.startedAt, window: custom.window,
                    radius: custom.radius, plates: custom.plates, scale: custom.scale });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            let at = body.position();
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                window: custom.window, plates: custom.plates, scale: custom.scale,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                // 实际受击点：目标碰撞箱上离攻击者最近的那一点，碎光就闪在那里。
                at = world.closestPoint(target, attacker.position());
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, quickGuardScene, 1, at, data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), quickGuardBlockText, [data.blocked], 24);
            world.sound("minecraft:item.shield.block", at, 12, "{}");
            MobEffects.consume(world, target, quickGuardEffect);
            effect.end();
        }
    });

    // 「已有先制行为」的观察点：任何敌人提交优先度大于 0 的招式（伤害或变化）都记一笔，供 AI 判断先制压力。
    // 提交点是只读作用域，这里只写本单元自己的观察表、不碰世界；没有这条事实时 AI 只把它当普通逼近威胁。
    WorldCombat.on("world_combat:move_quickguard/watch", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (!(move.priority() > 0)) return;
        quickGuardPriority[String(event.actor().ref())] = event.world().tick();
    });

    function quickGuardScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || quickGuardReferenceRadius) / quickGuardReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份快板（身份 + 只截敌方直击的一次性有界减免池）；返回这次快板罩住的人数。 */
    function quickGuardCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, plates: number, motes: number, linkRange: number, scale: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const startedAt = world.tick();
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, quickGuardEffect, ticks, 0) === null) return false;
            GuardEffects.apply(world, actor, { rule: quickGuardRule, mode: "pool", capacity: capacity, fraction: 0.6,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, plates: plates, motes: motes,
                scale: scale, window: ticks, radius: radius, startedAt: startedAt } as any, ticks);
            return true;
        }
        let reached = protect(caster) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            if (protect(other)) reached++;
        }
        return reached;
    }

    define({
        id: "quickguard",
        cooldownParameter: "wait",
        name: "快速防守",
        description: "抢在对手的下一手之前撑起一面快板，替自己与身边的队友各自接住第一记敌方直击，按来伤的六成有界削掉它，随即那块板碎掉；只架很短一瞬，非敌方直击不受影响。",
        uses: ["接住对手的第一记近战或弹丸直击", "在对手的急袭起手前抢一拍架板", "用一次最短的窗口替全队各吃一下快打"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 3,
        active: 1,
        recover: 4,
        cooldown: 130,
        style: "screen",
        stationary: true,
        defaults: { brace: 1, ai: { trigger: 8, ally: false } },
        fields: [
            field(pathOf("brace"), "架挡方式", "choice", {
                options: [
                    { value: 1, label: "抢拍" },
                    { value: 0, label: "稳架" }
                ],
                help: "抢拍：减免上限 ×0.75、半径 ×0.85，换来起手 −1 刻、冷却 ×0.85，出手最快；稳架：减免上限 ×1.25、半径 ×1.05，代价是起手 +1 刻、冷却 ×1.15，板更大更稳。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("quickguard", "radius", pokemon) : 3.2, geometry: "area", style: "screen", color: 0xBFE3FF,
                label: config && Number(config.brace) === 1 ? "快速防守 · 抢拍" : "快速防守 · 稳架" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["quickguard"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p("quickguard", "tempo", context))),
                recover: Math.round(p("quickguard", "aftercast", context)),
                cooldown: Math.round(p("quickguard", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_quickguard:brace", quickGuardScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", brace: config && Number(config.brace) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const capacity = Math.max(20, Math.round(p("quickguard", "capacity", action)));
            const window = Math.max(6, Math.round(p("quickguard", "window", action)));
            const radius = Math.max(1.6, p("quickguard", "radius", action));
            const plates = Math.max(6, Math.round(p("quickguard", "plates", action)));
            const motes = Math.max(10, Math.round(p("quickguard", "motes", action)));
            const linkRange = Math.min(32, radius * 1.6 + 1);
            const scale = quickGuardScale(radius);
            const reached = quickGuardCover(world, actor, radius, window, capacity, plates, motes, linkRange, scale);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, quickGuardScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), plates: plates, motes: motes, radius: radius, scale: scale,
                    window: window, intensity: Math.max(0.8, Math.min(2, plates / 12 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), quickGuardRaiseText,
                [capacity, reached, window], 34);
            world.sound("minecraft:block.glass.place", body.position(), 16, "{}");
            world.sound("minecraft:item.shield.block", body.position(), 14, "{}");
            done(action);
        }
    });

    // 板散：身份到期或被清除时，播一次收束留痕（读操作，任何作用域都能发）。
    WorldCombat.on("world_combat:move_quickguard/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== quickGuardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, quickGuardScene, 1, body.position(), { moment: "fall", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), quickGuardFallText, [], 22);
    });
}
