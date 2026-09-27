/**
 * 泼冷水 / chillingwater —— 注册与动作。
 *
 * 核心念头：兜起一团接近冰点的水，迎头泼在对手身上。水浇灭了它的力气（攻击下降，按实际变化结算），把它浇得湿透
 *   （借共享身份 world_combat:status/soaked）。已经湿透的目标被这一泼激得更冷：伤害更高、掉攻多一级——
 *   共享身份回流进这招自己的公式。
 *
 * 自由瞄准（kind: "aim"）：可指向任意阵营实体或一个世界点，碰墙即停。谁实际碰到水团，就按谁当刻的
 *   湿身状态结算这一泼；命中的伤害被拒绝（相性免疫、权限、已被挡下）时不降攻、只当水花落地。
 *
 * 三幕：
 *   起（windup，提交前）：水在头顶兜成一颗冷冽的水团（`action.present` 预告）。
 *   泼（throw → drench / splash）：提交后水团飞向准线；飞行表现绑在真实弹体 id 上，与弹体同行。
 *     命中活物时以**该受击者**为上下文求威力／掉攻级数，实际伤害成立才降攻；湿身由一个**属于这次施放的托管效果**
 *     挂上并维持画面，效果随真实的 soaked 载体存续——载体被驱散或提前清除时，画面同刻收束，不留残留。
 *   渍（splash）：到程落空时水花散在弹体真正的末端（`world.projectilePosition`），不落在选中目标当前位置。
 *
 * 与同族分开：水之波动是沿直线荡开的水环、万有引力从头顶落下苹果；泼冷水是**单体、必然掉攻、留下湿身**的一泼。
 */
namespace PokemonSkills {
    const chillingwaterScene = "world_combat:move_chillingwater";
    const chillingwaterSoaked = "world_combat:chillingwater_soaked";
    const chillingwaterSoakEffect = "world_combat:chillingwater_soak";
    const chillingwaterText = "world_combat.move.chillingwater.text.drench";
    const chillingwaterSoakText = "world_combat.move.chillingwater.text.soakonly";

    /** 湿身画面绑在这次施放自己的托管效果上：载体被清除/刷新时，托管效果结束，画面同刻收回。 */
    function chillingwaterSoakVisual(effect: CombatEffect, drops: number, stages: number, bonus: number, scale: number, intensity: number): void {
        const world = effect.world(), victim = effect.target();
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "chillingwater:soak:" + String(victim.ref()), chillingwaterScene, 1, body.position(),
            { moment: "soak", target: String(victim.ref()), drops: drops, stages: stages, bonus: bonus, scale: scale, intensity: intensity });
    }

    WorldCombat.effect(chillingwaterSoakEffect, 1, 400, "actor", function (json) {
        const value = JSON.parse(json);
        ["ticks", "drops", "stages", "bonus", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid chillingwater soak state");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    WorldCombat.effectHandler(chillingwaterSoakEffect, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.apply(world, victim, chillingwaterSoaked, data.ticks, 0);
        if (carrier === null) { effect.end(); return; }
        data.anchor = MobEffects.anchor(carrier);
        effect.state(JSON.stringify(data));
        chillingwaterSoakVisual(effect, data.drops, data.stages, data.bonus, data.scale, data.intensity);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(chillingwaterSoakEffect, "hold", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.read(world, victim, chillingwaterSoaked);
        // 载体被驱散、被替换（新 revision）或提前清除：这次施放的画面收束，不再跟着一个失效锚。
        if (carrier === null || !data.anchor || String(carrier.key()) !== String(data.anchor.key)) { effect.end(); return; }
        effect.remaining(carrier.duration() < 0 ? 400 : Math.max(1, Math.min(400, carrier.duration())));
        chillingwaterSoakVisual(effect, data.drops, data.stages, data.bonus, data.scale, data.intensity);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(chillingwaterSoakEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "chillingwater",
        cooldownParameter: "wait",
        name: "Chilling Water",
        description: "兜起一团接近冰点的水迎头泼在对手身上：浇灭它的力气（攻击下降）、把它浇得湿透，落点留下湿冷水渍。已经湿透的目标会被激得更冷，这一泼伤害更高、掉攻多一级。",
        uses: ["压低对手的物理输出", "把目标浇湿，让后续水冰招能利用这层湿身"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "chillwater",
        defaults: { ai: { maxChase: 14 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: Math.max(0.6, p("chillingwater", "radius", pokemon)), geometry: "circle", style: "chillwater",
                color: 0x6FC3E8, label: "泼冷水" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["chillingwater"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("chillingwater", "tempo", context)),
                recover: Math.round(p("chillingwater", "aftercast", context)),
                cooldown: Math.round(p("chillingwater", "wait", context)),
                active: 0,
                range: p("chillingwater", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("chillingwater:gather", chillingwaterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(chillingwaterScene);
            const origin = action.origin();
            const speed = p("chillingwater", "velocity", action);
            const radius = p("chillingwater", "radius", action);
            const chill = Math.max(60, Math.round(p("chillingwater", "chillTicks", action)));
            const drops = Math.max(8, Math.round(p("chillingwater", "drops", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.22));
            // 视觉强度用无目标的中性上下文，避免把选中目标的湿身状态误当成实际命中结果。
            const baseline = Math.max(0.5, Math.min(2, p("chillingwater", "drench", withTarget(factContext(action), null)) / 50));
            const range = action.range();
            const offset = action.targetPosition().minus(origin);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "cobblemon:move.watergun.actor");
            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: 180, direction: direction,
                appearance: { sprite: "cobblemon:generic/water/waterjet", tint: 0x8FD6F5, glow: true, scale: Math.max(0.7, Math.min(1.5, scale)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 以真实受击者为上下文：威力与掉攻级数读到的是这个身体当刻的湿身状态。
                        const aimed = withTarget(factContext(current), victim);
                        const power = p("chillingwater", "drench", aimed);
                        const stages = Math.max(1, Math.min(2, Math.round(p("chillingwater", "atkDrop", aimed))));
                        const soaked = CombatStatus.has(scope, victim, "soaked") ? 1 : 0;
                        const landed = impact(current, hit, "chillingwater", power, { damage: damageSpec("chillingwater", "drench") });
                        const intensity = Math.max(0.5, Math.min(2, power / 50));
                        if (landed) {
                            // 降攻反馈取真实变化：免疫或已到底时 boost 返回 0，就不再谎报掉攻。
                            const drop = NativeEffects.boost(scope, victim, "atk", -stages);
                            const actual = Math.abs(drop);
                            scope.effect(chillingwaterSoakEffect, victim,
                                JSON.stringify({ ticks: chill, drops: drops, stages: Math.max(1, actual), bonus: soaked, scale: scale, intensity: intensity }), chill);
                            WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                                { moment: "drench", target: String(victim.ref()), drops: drops, stages: stages, bonus: soaked,
                                    scale: scale, intensity: intensity }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                                actual > 0 ? chillingwaterText : chillingwaterSoakText, actual > 0 ? [actual] : [], 30);
                            scope.sound("cobblemon:impact.water", point, 16, "{}");
                        } else {
                            // 伤害被拒绝：只当冷水打在身上，不降攻、不加湿身、不报成功。
                            WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                                { moment: "splash", drops: drops, bonus: 0, scale: scale, intensity: intensity }, 22);
                            scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                        }
                    } else {
                        WorldFeedback.emit(scope, chillingwaterScene, 1, point,
                            { moment: "splash", drops: drops, bonus: 0, scale: scale, intensity: baseline }, 22);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    // 到程落空：水花散在弹体沿准线真正走到的末端，而不是选中目标当前位置。
                    const end = current.world().projectilePosition(flight);
                    if (end !== null)
                        WorldFeedback.emit(current.world(), chillingwaterScene, 1, end,
                            { moment: "splash", drops: drops, bonus: 0, scale: scale, intensity: baseline }, 20);
                }
                finish(current);
            });
            // 飞行表现绑真实弹体 id，与弹体同行；动作收束时同刻停掉。
            scenes.show(action, "throw", origin,
                { moment: "throw", projectile: flight, drops: drops, scale: scale, intensity: baseline });
        }
    });
}
