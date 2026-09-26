/**
 * 快速防守 / quickguard — 执行组织与结算。
 *
 * 核心念头：抢在对手的先制之前，用一记更快的格挡把那一手磕开——一道极短的、朝来袭方向斜撑的快板，
 *   挡下贴着速度打来的那一串快击，挡几下就散。
 *
 * 两幕：
 *   沉（windup 播「按地聚板」，提交前只观察与预告，打断不花代价）。
 *   张（提交后）：施法者与半径内的友方各挂共享身份 world_combat:status/quickguard 的真实 MobEffect，
 *     并各自领到一层共享 GuardEffects 的 pool（规则 world_combat:move_quickguard）：只截 priority > 0 的
 *     敌对伤害，按总量磨穿。先制的**变化**招式（priority > 0 且 category=status）另由提交点监听直接顶回，
 *     这样「先制的全部类型」都被覆盖，而不只是伤害。
 * 持续：每约 8 刻由池的 pulse 续一次快板；目标还带着身份才继续立着。
 * 结束：任一人的池磨穿或到时，身份与池一起收；离开施法者太远的人随共享连接断开而失去。
 */
namespace PokemonSkills {
    const quickGuardScene = "world_combat:move_quickguard";
    const quickGuardEffect = "world_combat:quick_guard";
    const quickGuardRule = "world_combat:move_quickguard";
    const quickGuardStatus = "quickguard";
    const quickGuardRaiseText = "world_combat.move.quickguard.text.raise";
    const quickGuardBlockText = "world_combat.move.quickguard.text.block";
    const quickGuardFallText = "world_combat.move.quickguard.text.fall";
    const quickGuardWardText = "world_combat.move.quickguard.text.ward";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const quickGuardReferenceRadius = 3.2;
    /** 被顶回的先制变化招式：提交点只读，先记在这里，等目标身上的身份下一次 tick（可写作用域）再补画面。 */
    const quickGuardWards: { [ref: string]: { at: number; move: string } } = Object.create(null);
    /** 观察到的敌方先制出手：攻击者 ref -> 最近一次 priority>0 出手的 tick。AI 的「已有先制行为」判据。 */
    const quickGuardPriority: { [ref: string]: number } = Object.create(null);
    /** 攻击者在 maxAge 刻内是否真的出手过先制招式。 */
    export function quickGuardPrioritySeen(ref: string, tick: number, maxAge: number): boolean {
        const at = quickGuardPriority[ref];
        return at !== undefined && tick - at <= maxAge;
    }

    // 快板的结算点：只截敌对来源、priority > 0 的伤害，按 pool 磨穿；磨穿即收掉该人身上的身份。
    GuardEffects.register(quickGuardRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            const priority = incoming.data ? Number(incoming.data.priority) : 0;
            return isFinite(priority) && priority > 0;
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target();
            // 身份被人清掉时，池也一并收；这就是「解除」的路。
            if (MobEffects.read(world, target, quickGuardEffect) === null) { effect.end(); return; }
            const body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            // 持续画面绑在这层真实按量吸收池上：池磨穿、身份被清或连接断开时随它一起收，不再多播一段固定时长。
            WorldFeedback.onEffect(world, effect.id(), "quickguard:hold:" + String(target.ref()), quickGuardScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), plates: custom.plates, remaining: state.capacity,
                    scale: custom.scale, intensity: quickGuardIntensity(state.capacity, custom.initial) });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                remaining: Math.round(state.capacity * 10) / 10, plates: custom.plates, scale: custom.scale,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, quickGuardScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), quickGuardBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, quickGuardEffect);
        }
    });

    // 先制的「非伤害」那一半：priority > 0 且 category=status 的敌对招式落到带身份的目标头上时，在提交点顶上回去。
    // 伤害那一半由上面的 pool 在命中时吸收；两条合起来覆盖原生的「先制招式全体」。
    // 提交点是只读作用域，这里只拒绝并记下这一手；画面由目标身上身份的 tick 处理器（可写）补播。
    WorldCombat.on("world_combat:move_quickguard/ward", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status" || !(move.priority() > 0)) return;
        const world = event.world(), target = action.target();
        if (target === null) return;
        if (String(event.actor().key()) === String(target.key())) return;
        if (world.friendly(target)) return;
        if (!CombatStatus.has(world, target, quickGuardStatus)) return;
        event.reject("quickguard");
        quickGuardWards[String(target.ref())] = { at: world.tick(), move: String(move.id()) };
    });

    // 「已有先制行为」的观察点：任何敌人提交优先度大于 0 的招式（伤害或变化）都记一笔，供 AI 判断先制压力。
    // 提交点是只读作用域，这里只写本单元自己的观察表、不碰世界；没有这条事实时 AI 不把普通敌人当先制。
    WorldCombat.on("world_combat:move_quickguard/watch", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (!(move.priority() > 0)) return;
        quickGuardPriority[String(event.actor().ref())] = event.world().tick();
    });

    // 顶回画面的兑现点：目标身上的身份每 tick 收到一次可写事件，发现有刚被顶回的先制变化招就补播一记。
    WorldCombat.on("world_combat:move_quickguard/deflect", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== quickGuardEffect) return;
        const world = event.world(), actor = event.actor(), ref = String(actor.ref());
        const pending = quickGuardWards[ref];
        if (pending === undefined) return;
        delete quickGuardWards[ref];
        if (world.tick() - pending.at > 20) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, quickGuardScene, 1, body.position(), { moment: "ward", target: ref }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), quickGuardWardText, [], 22);
        world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
    });

    /** 池的余量换算成画面强度：满板 1、见底趋近 0.15。 */
    function quickGuardIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function quickGuardScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || quickGuardReferenceRadius) / quickGuardReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份快板（身份 + 只截先制伤害的按量吸收池）；返回这次快板罩住的人数。 */
    function quickGuardCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, plates: number, motes: number, linkRange: number, scale: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, quickGuardEffect, ticks, 0) === null) return false;
            GuardEffects.apply(world, actor, { rule: quickGuardRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, plates: plates, motes: motes, scale: scale } as any, ticks);
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
        description: "抢在对手的先制之前撑起一面快板，替自己与身边的队友把先制攻击（优先度大于 0 的招式）磕开；挡几下就散，非先制的攻击穿得过。",
        uses: ["挡住贴速度打来的先制连击", "在对手的急袭起手前抢一拍架板", "用一次最短的窗口替全队吃下一串快打"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 4,
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
                help: "抢拍：吸收总量 ×0.75、时长 ×0.8、半径 ×0.85，换来起手 −1 刻、冷却 ×0.85，出手最快；稳架：吸收总量 ×1.25、时长 ×1.25、半径 ×1.05，代价是起手 +2 刻、冷却 ×1.15，架得更稳更久。"
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
            const window = Math.max(45, Math.round(p("quickguard", "window", action)));
            const radius = Math.max(1.6, p("quickguard", "radius", action));
            const plates = Math.max(6, Math.round(p("quickguard", "plates", action)));
            const motes = Math.max(10, Math.round(p("quickguard", "motes", action)));
            const linkRange = Math.min(32, radius * 1.6 + 1);
            const scale = quickGuardScale(radius);
            const reached = quickGuardCover(world, actor, radius, window, capacity, plates, motes, linkRange, scale);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, quickGuardScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), plates: plates, motes: motes, radius: radius, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, plates / 12 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), quickGuardRaiseText,
                [Math.round(capacity), reached, Math.round(window / 20)], 34);
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
