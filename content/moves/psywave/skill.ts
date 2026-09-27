/**
 * 精神波 / psywave —— 注册与动作。
 *
 * 核心念头：朝目标推出一道**不稳定的念力波前**：它沿瞄准方向穿透一排目标，每次出手的强弱都不同，
 *   画面上的环数与亮度直接对应当前这一次的强弱。
 *
 * 待发强度：每个个体持有一枚托管准备标记，保存「下一发」已摇定的强弱。准备期读出并显示它，提交时
 *   应用同一值，同时把再下一发存回标记。取消准备只丢掉本次动作，标记不动，因此收起再准备仍是同一发。
 *
 * 两幕：
 *   起（windup）：按待发强度亮出环数与亮度，出手前即可读出强弱；不写世界。
 *   放（execute）：用同一强度推波，沿瞄准方向推进，每命中一个非友方结算一次 `wave` 并继续穿透，
 *       最多额外穿过 `pierce` 个；穿透用尽、撞墙或飞满射程后在 `world.projectilePosition` 的真实末点收场。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，空放同样消耗这一发已经摇定的强度。配置 `surge` 改威力与
 *   波动幅度、收招；时序与冷却由速度决定。
 */
namespace PokemonSkills {
    /** 待发强弱标记：跟着施法者，有界生命周期；不是可见状态，只作准备资源。 */
    const psywavePending = "world_combat:psywave_pending";
    const psywavePendingTicks = 1200;

    WorldCombat.effect(psywavePending, 1, psywavePendingTicks, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.roll !== "number" || !isFinite(value.roll) || value.roll <= 0) throw new Error("Invalid psywave pending: roll");
        if (typeof value.tier !== "number" || !isFinite(value.tier)) throw new Error("Invalid psywave pending: tier");
        if (typeof value.rings !== "number" || !isFinite(value.rings)) throw new Error("Invalid psywave pending: rings");
        return JSON.stringify({ roll: value.roll, tier: value.tier, rings: Math.max(1, Math.round(value.rings)) });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(psywavePending, "start", function () { });
    WorldCombat.effectHandler(psywavePending, "operation:world_combat:dispel", function (effect) { effect.end(); });

    interface PsywaveRoll { roll: number; tier: number; rings: number; }

    /** 摇一次强弱；纯读取公式与随机流，不落盘。 */
    function psywaveRoll(action: CombatAction): PsywaveRoll {
        const baseRings = Math.max(3, Math.round(p(psywaveId, "rings", action)));
        const swing = Math.max(0.05, Math.min(0.85, p(psywaveId, "swing", action)));
        const roll = 1 + (action.sense().random() * 2 - 1) * swing;
        const tier = Math.max(0, Math.min(1, (roll - (1 - swing)) / (2 * swing)));
        return { roll: roll, tier: tier, rings: Math.max(2, Math.round(baseRings * (0.55 + 0.45 * roll))) };
    }
    /** 个体当前的待发强度；没有返回 null。 */
    function psywavePendingValue(world: CombatWorld, actor: CombatActor): PsywaveRoll | null {
        const views = world.effects(actor, psywavePending);
        if (views.length === 0) return null;
        try { return <PsywaveRoll>JSON.parse(String(views[0].data())); } catch (error) { return null; }
    }
    /** 本次动作的稳定强度：先读本次动作数据，再读待发标记，都没有才现摇；结果存进动作数据供 execute 复用。 */
    function psywaveChosen(action: CombatAction): PsywaveRoll {
        const key = "world_combat:psywave/roll", stored = action.data(key);
        if (stored !== null) return <PsywaveRoll>JSON.parse(stored);
        const value = psywavePendingValue(action.sense(), action.actor()) || psywaveRoll(action);
        action.data(key, JSON.stringify(value));
        return value;
    }
    /** 提交后摇出下一发待发强度，替换旧标记。 */
    function psywaveAdvance(world: CombatWorld, actor: CombatActor, action: CombatAction): void {
        world.effects(actor, psywavePending).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        world.effect(psywavePending, actor, JSON.stringify(psywaveRoll(action)), psywavePendingTicks);
    }

    define({
        id: psywaveId,
        cooldownParameter: "recharge",
        name: "Psywave",
        description: "朝目标推出一道不稳定的念力波前：它沿瞄准方向穿透多个对手，每命中一个结算一次特殊伤害，且每次出手的强度都不同——画面上的环数与亮度直接显示这一发是强是弱。",
        uses: ["打穿排成一列的几个目标", "用便宜的一发补伤害，赌一次高波动", "在稳流式下当作稳定的远程输出"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "psychic",
        defaults: { surge: false, ai: { maxChase: 15, crowd: true } },
        fields: [flag("surge", "涌动")],
        indicator: function (config, pokemon) {
            return { radius: p(psywaveId, "width", pokemon) * 2.4, geometry: "line", style: "psychic", color: 0x8E6FE0,
                label: config && config.surge === true ? "精神波·涌动" : "精神波·稳流" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psywaveId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psywaveId, "tempo", context)),
                recover: Math.round(p(psywaveId, "aftercast", context)),
                cooldown: Math.round(p(psywaveId, "recharge", context)),
                active: 0,
                range: p(psywaveId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const rolled = psywaveChosen(action);
            action.present("world_combat:psywave:unstable", psywaveScene, 1, action.origin(),
                JSON.stringify({ moment: "unstable", windup: prepare, surge: config && config.surge === true,
                    rings: rolled.rings, tier: rolled.tier }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(psywaveScene);
            const origin = action.origin();
            const base = p(psywaveId, "wave", action);
            const rolled = psywaveChosen(action);
            const power = Math.max(1, base * rolled.roll);
            const speed = p(psywaveId, "velocity", action);
            const width = Math.max(0.25, p(psywaveId, "width", action));
            const pierce = Math.max(1, Math.min(9, Math.round(p(psywaveId, "pierce", action))));
            const scale = Math.max(0.6, Math.min(2.0, width / 0.55));
            let hits = 0, settled = false, flightId = "";

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            sound(action, "cobblemon:move.confusion.actor");
            // 提交后才抽下一发待发强度：取消准备不会改变已显示的这一发。
            psywaveAdvance(action.world(), action.actor(), action);

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/energyorb", tint: 0x8E6FE0, glow: true,
                scale: Math.max(0.8, Math.min(1.6, width / 0.5)),
                pierce: pierce
            };
            flightId = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: width, lifetime: 140, direction: aim(action),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    const landed = impact(current, hit, psywaveId, power, { damage: damageSpec(psywaveId, "wave") });
                    if (landed) {
                        hits++;
                        sound(current, "cobblemon:impact.psychic");
                        WorldFeedback.emit(scope, psywaveScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), rings: rolled.rings, scale: scale,
                                tier: rolled.tier, power: Math.round(power * 10) / 10 }, 26);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), psywaveHitText, [Math.round(power)], 22);
                    }
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                // 真实末点：穿透用尽、撞墙或飞满射程后由弹体保留的最后接触/结束点给出，不用瞄点或满射程点假造。
                const end = scope.projectilePosition(flightId);
                if (hits === 0 && end !== null) {
                    WorldFeedback.emit(scope, psywaveScene, 1, end, { moment: "miss", scale: scale, width: width }, 20);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), psywaveMissText, [], 20);
                }
                finish(current);
            });
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flightId, rings: rolled.rings, scale: scale,
                    tier: rolled.tier, pierce: pierce });
        }
    });
}
