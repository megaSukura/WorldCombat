/**
 * 毒针 / poisonsting —— 出手方式。
 *
 * 核心念头：一发**廉价的远程细针**。飞得远、伤害极低、出手快、冷却短；针扎进身体后不立刻发作，毒在伤口里
 *   慢慢渗开——玩家会看到「中针」与「中毒」是两件事。它卖的是便宜与次数。
 *
 * 三幕：
 *   起（windup，提交前）：举针、针尖挂着毒滴的预告（`action.present`，可被打断、不花 PP）。
 *   飞（fly）：提交后射出一枚细针投射物，带有限追踪（只有真的有实体目标时才追），拖一条毒绿灯尾；可对空、对墙射。
 *   扎（stick → seep）：命中实体且**真的造成伤害**，才在这名受击者身上留一个短命托管效果，隔 `seep` 之后
 *       毒才在伤口里发作，按 `poisonChance` 施加共享中毒身份；飞针动作当场结束，不等渗毒。
 *       被拒绝伤害／免疫、命中墙或无人：只在真实接触点插针碎落，不创建有效毒针。
 *
 * 与同族分开：毒击是站定出臂的近身重刺、双针是一记两根、臂贝武器是重炮；只有毒针是**一发一发往外甩的便宜细针**，
 *   反制方式是走位甩开飞行中的针。
 */
namespace PokemonSkills {
    const poisonstingScene = "world_combat:move_poisonsting";
    const poisonstingVenomText = "world_combat.move.poisonsting.text.venom";
    const poisonstingWhiffText = "world_combat.move.poisonsting.text.whiff";
    /** 中针后留在受击者身上的短命托管效果：到 `seep` 那一刻判定毒；被提前清除就不结算。 */
    const poisonstingSeepMark = "world_combat:move_poisonsting/seep";

    /**
     * 托管渗毒：针真的扎出伤害后才创建，挂在受击者身上。它自己安排一次 `seep` 到时，
     * 表现与它同生共死；被 `world_combat:dispel` 提前清掉时不施加毒。
     */
    function poisonstingSeepStart(effect: CombatEffect): void {
        const world = effect.world();
        const state = JSON.parse(effect.state());
        const victim = world.actor(String(state.ref));
        if (victim === null || !world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        // 本载体就是本 source 创建的托管效果，presentOn 随它自然或提前结束一起清理。
        WorldFeedback.onEffect(world, effect.id(), "embed", poisonstingScene, 1, body.position(),
            { moment: "embed", target: String(state.ref), needles: state.needles, scale: state.scale, intensity: state.intensity });
        effect.schedule("seep", "seep", Math.max(1, Math.round(Number(state.seep))), "{}");
    }
    function poisonstingSeepTick(effect: CombatEffect): void {
        const world = effect.world();
        const state = JSON.parse(effect.state());
        const victim = world.actor(String(state.ref));
        if (victim === null || !world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const poisoned = world.random() < Number(state.chance)
            && CombatStatus.inflict(world, victim, "poison", Math.max(40, Math.round(Number(state.venomTicks))), 0, { secondary: true });
        WorldFeedback.emit(world, poisonstingScene, 1, body.position(),
            { moment: "seep", target: String(state.ref), needles: state.needles, scale: state.scale, intensity: state.intensity }, 22);
        if (poisoned) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), poisonstingVenomText, [], 22);
        if (poisoned) world.sound("cobblemon:impact.poison", body.position(), 14, "{}");
        effect.end();
    }
    WorldCombat.effect(poisonstingSeepMark, 1, 200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object" || typeof value.ref !== "string") throw new Error("Invalid poison sting seep state");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(poisonstingSeepMark, "start", poisonstingSeepStart);
    WorldCombat.effectHandler(poisonstingSeepMark, "seep", poisonstingSeepTick);
    WorldCombat.effectHandler(poisonstingSeepMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "poisonsting",
        cooldownParameter: "recharge",
        name: "Poison Sting",
        description: "甩出一发廉价的远程细针，伤害极低但射程远、出手快、冷却短。可以朝任意方向、方块或目标射出；针真的扎出伤害后毒才在伤口里慢慢渗开，按概率让目标中毒。倒钩针更容易留住毒，代价是飞得慢、打得更轻。",
        uses: ["远距离反复点射", "给远处目标慢慢挂上毒", "在冷却缝隙里补一发小伤害"],
        kind: "aim",
        range: 11,
        maxRange: 15,
        prepare: 6,
        active: 2,
        recover: 5,
        cooldown: 8,
        style: "needle",
        defaults: { barbed: false, ai: { maxChase: 14, spreadVenom: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["poisonsting"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("poisonsting", "tempo", context)),
                recover: Math.round(p("poisonsting", "settle", context)),
                cooldown: Math.round(p("poisonsting", "recharge", context)),
                active: 2,
                range: p("poisonsting", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const needles = Math.max(4, Math.round(p("poisonsting", "needles", action)));
            action.present("poisonsting:aim:" + action.id(), poisonstingScene, 1, action.origin(),
                JSON.stringify({ moment: "aim", windup: prepare, needles: needles, barbed: config && config.barbed ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["poisonsting"], detail: { values: config } };
            return { radius: p("poisonsting", "reach", context), geometry: "line", style: "needle", color: 0x9BE86B,
                label: config && config.barbed === true ? "毒针·倒钩" : "毒针" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const direction = aim(action);
            const speed = p("poisonsting", "needleSpeed", action);
            const radius = p("poisonsting", "needleRadius", action);
            const power = p("poisonsting", "tip", action);
            const chance = p("poisonsting", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("poisonsting", "venomTicks", action)));
            const seep = Math.max(2, Math.round(p("poisonsting", "seep", action)));
            const needles = Math.max(6, Math.round(p("poisonsting", "needles", action)));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.14));
            const intensity = Math.max(0.6, Math.min(1.8, power / 15));
            const appearance: any = { sprite: "cobblemon:particle/generic/spike", tint: 0x9BE86B, glow: true, scale: Math.max(0.8, radius / 0.14) };
            // 只有真的有实体目标时才有限追踪；对空/对点直飞。
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: 16, range: action.range() };
            let settled = false, resolved = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.arrow.shoot");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    const scope = current.world();
                    const victim = hit.target();
                    const point = hit.position();
                    if (victim === null || !scope.valid(victim)) {
                        // 普通碰墙（或首碰不是活体）：只在真实接触点插针碎落。
                        resolved = true;
                        WorldFeedback.emit(scope, poisonstingScene, 1, point,
                            { moment: "whiff", needles: needles, scale: scale }, 16);
                        return;
                    }
                    const dealt = impact(current, hit, "poisonsting", power, { damage: damageSpec("poisonsting", "tip") });
                    if (!dealt) {
                        // 免伤／拒绝伤害：不插有效毒针。
                        resolved = true;
                        WorldFeedback.emit(scope, poisonstingScene, 1, point,
                            { moment: "whiff", needles: needles, scale: scale }, 16);
                        return;
                    }
                    WorldFeedback.emit(scope, poisonstingScene, 1, point,
                        { moment: "stick", target: String(victim.ref()), needles: needles,
                            projectile: flight, scale: scale, intensity: intensity }, 18);
                    resolved = true;
                    // 真的扎出伤害才留毒；由这个短命托管效果到 `seep` 时判定，动作不等待渗毒。
                    scope.effect(poisonstingSeepMark, victim, JSON.stringify({
                        ref: String(victim.ref()), chance: chance, venomTicks: venomTicks, seep: seep,
                        needles: needles, scale: scale, intensity: intensity
                    }), seep + 40);
                }
            }, function (current: CombatAction) {
                if (!resolved) {
                    WorldFeedback.emit(current.world(), poisonstingScene, 1, current.targetPosition(),
                        { moment: "whiff", needles: needles, scale: scale }, 16);
                    WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.4, 0)), poisonstingWhiffText, [], 18);
                }
                finish(current);
            });
            WorldFeedback.emit(world, poisonstingScene, 1, action.origin(),
                { moment: "fly", projectile: flight, needles: needles, direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity }, 24);
        }
    });
}
