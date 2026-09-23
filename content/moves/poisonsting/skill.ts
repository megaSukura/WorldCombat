/**
 * 毒针 / poisonsting —— 出手方式。
 *
 * 核心念头：一发**廉价的远程细针**。飞得远、伤害极低、出手快、冷却短；针扎进身体后不立刻发作，毒在伤口里
 *   慢慢渗开——玩家会看到「中针」与「中毒」是两件事。它卖的是便宜与次数。
 *
 * 三幕：
 *   起（windup，提交前）：举针、针尖挂着毒滴的预告（`action.present`，可被打断、不花 PP）。
 *   飞（fly）：提交后射出一枚细针投射物，带有限追踪，拖一条毒绿灯尾。
 *   扎（stick → seep）：命中目标的瞬间只结算 `tip` 物理伤害并把针留在身上；隔 `seep` 之后毒才在伤口里发作，
 *       按 `poisonChance` 施加共享中毒身份。命中墙或无人只播落空。
 *
 * 与同族分开：毒击是站定出臂的近身重刺、双针是一记两根、臂贝武器是重炮；只有毒针是**一发一发往外甩的便宜细针**，
 *   反制方式是走位甩开飞行中的针。
 */
namespace PokemonSkills {
    const poisonstingScene = "world_combat:move_poisonsting";
    const poisonstingVenomText = "world_combat.move.poisonsting.text.venom";
    const poisonstingWhiffText = "world_combat.move.poisonsting.text.whiff";

    define({
        id: "poisonsting",
        cooldownParameter: "recharge",
        name: "Poison Sting",
        description: "甩出一发廉价的远程细针，伤害极低但射程远、出手快、冷却短。针扎进身体后毒在伤口里慢慢渗开，按概率让目标中毒。倒钩针更容易留住毒，代价是飞得慢、打得更轻。",
        uses: ["远距离反复点射", "给远处目标慢慢挂上毒", "在冷却缝隙里补一发小伤害"],
        kind: "enemy",
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
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: 16, range: action.range() };
            let settled = false, stuck = false, stuckRef = "";

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.arrow.shoot");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    const scope = current.world();
                    const victim = hit.target();
                    const point = hit.position();
                    WorldFeedback.emit(scope, poisonstingScene, 1, point,
                        { moment: "stick", target: victim === null ? "" : String(victim.ref()), needles: needles,
                            projectile: flight, scale: scale, intensity: intensity }, 18);
                    if (victim === null || !scope.valid(victim)) return;
                    impact(current, hit, "poisonsting", power, { damage: damageSpec("poisonsting", "tip") });
                    stuck = true; stuckRef = String(victim.ref());
                    current.after(seep, function (inner: CombatAction) {
                        const body = inner.world();
                        const wounded = body.actor(stuckRef);
                        if (wounded === null || !body.valid(wounded)) { finish(inner); return; }
                        const poisoned = body.random() < chance && CombatStatus.inflict(body, wounded, "poison", venomTicks, 0, { secondary: true });
                        const at = body.observe(wounded);
                        if (at !== null) {
                            WorldFeedback.emit(body, poisonstingScene, 1, at.position(),
                                { moment: "seep", target: stuckRef, needles: needles, scale: scale, intensity: intensity }, 22);
                            if (poisoned) WorldFeedback.text(body, at.position().plus(WorldCombat.point(0, 1.0, 0)), poisonstingVenomText, [], 22);
                        }
                        if (poisoned) body.sound("cobblemon:impact.poison", at === null ? inner.origin() : at.position(), 14, "{}");
                        finish(inner);
                    });
                }
            }, function (current: CombatAction) {
                if (stuck) return;
                WorldFeedback.emit(current.world(), poisonstingScene, 1, current.targetPosition(),
                    { moment: "whiff", needles: needles, scale: scale }, 16);
                WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.4, 0)), poisonstingWhiffText, [], 18);
                finish(current);
            });
            WorldFeedback.emit(world, poisonstingScene, 1, action.origin(),
                { moment: "fly", projectile: flight, needles: needles, direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity }, 24);
        }
    });
}
