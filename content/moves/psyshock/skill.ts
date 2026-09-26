/**
 * 精神冲击 / psyshock —— 注册与动作。
 *
 * 核心念头：把念波**压成一枚实心棱投出去**。它不是光束、不是抓握，是一件有重量、会下坠、撞上会碎的实体；
 *   因为是实体，它按物体的方式砸进去——对目标的物理防御结算。
 *
 * 两幕（提交前只播预告）：
 *   起（windup）：手前把念波压成一枚半透明的棱，只播预告。
 *   掷 + 撞（execute）：棱朝瞄准方向脱手，走直线、随距离下坠；命中结算 `shard` 伤害、把目标顶开、棱碎成屑；
 *       撞到地形只碎棱（真实接触格，不结算伤害），飞完全程也算结束（miss）。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，可以抬高准心补偿下坠；提交时没有敌人也成立。
 *   `execute` 用 `aim(action)` 读取方向，命中权限仍由命中层判断。
 *
 * 与同族分开：精神击破是同描述的头顶重物下砸（带冲击面与削特防），幻象光线是会拐弯追踪的光束。
 *   精神冲击是一枚不追踪、最便宜的实体投掷。配置 `heavy` 由 resolve 改时序、由公式改威力／弹速／下坠／击退。
 */
namespace PokemonSkills {
    define({
        id: psyshockId,
        cooldownParameter: "recharge",
        name: "Psyshock",
        description: "把念波压成一枚实心的念力棱投出去：它走直线、随距离下坠，撞上目标时按物理防御结算特殊伤害并把它顶开，棱碎成屑。",
        uses: ["中远距离打一发按物理防御结算的念力冲击", "把脆皮目标顶离原位置", "用最便宜的一发补掉残血"],
        kind: "aim",
        range: 13,
        maxRange: 20,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "psychic",
        defaults: { heavy: false, ai: { maxChase: 17 } },
        fields: [flag("heavy", "重棱")],
        indicator: function (config, pokemon) {
            return { radius: p(psyshockId, "radius", pokemon) * 3.2, geometry: "line", style: "psychic", color: 0x7A52E6,
                label: config && config.heavy === true ? "精神冲击·重棱" : "精神冲击·轻棱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psyshockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psyshockId, "tempo", context)),
                recover: Math.round(p(psyshockId, "aftercast", context)),
                cooldown: Math.round(p(psyshockId, "recharge", context)),
                active: 0,
                range: p(psyshockId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:psyshock:mold", psyshockScene, 1, action.origin(),
                JSON.stringify({ moment: "mold", heavy: config && config.heavy === true, vanes: Math.round(p(psyshockId, "vanes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(psyshockScene);
            const origin = action.origin();
            const direction = aim(action);
            const heading: number[] = [direction.x(), direction.y(), direction.z()];
            const power = p(psyshockId, "shard", action);
            const speed = p(psyshockId, "velocity", action);
            const gravity = p(psyshockId, "gravity", action);
            const radius = p(psyshockId, "radius", action);
            const push = p(psyshockId, "push", action);
            const vanes = Math.max(8, Math.round(p(psyshockId, "vanes", action)));
            const scale = Math.max(0.5, Math.min(2.0, radius / 0.3));
            const intensity = Math.max(0.5, Math.min(2.4, power / 88));
            let impacted = false, walled = false, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            sound(action, "cobblemon:move.psychic.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/psychic/psyswirl", tint: 0x7A52E6, glow: true,
                scale: Math.max(0.7, Math.min(1.5, radius / 0.28))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 160,
                direction: direction,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    if (impacted || walled) return;
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    // 自由瞄准：不要求存在敌人。撞墙只碎棱——在真实接触格碎开，不结算伤害。
                    if (victim === null) {
                        if (!hit.blocked()) return;
                        walled = true;
                        scenes.stop(current, "flight");
                        WorldFeedback.emit(scope, psyshockScene, 1, point,
                            { moment: "wall", direction: heading, vanes: vanes, scale: scale, intensity: intensity }, 24);
                        sound(current, "minecraft:block.glass.break");
                        return;
                    }
                    if (!hit.hitEntity()) return;
                    impacted = true;
                    scenes.stop(current, "flight");
                    const landed = scope.valid(victim) && !scope.friendly(victim)
                        ? impact(current, hit, psyshockId, power) : false;
                    WorldFeedback.emit(scope, psyshockScene, 1, point,
                        { moment: landed ? "impact" : "miss", target: String(victim.ref()), direction: heading,
                            vanes: vanes, scale: scale, intensity: intensity }, 28);
                    if (landed) {
                        sound(current, "cobblemon:impact.psychic");
                        const body = scope.observe(victim);
                        if (body !== null) {
                            const delta = point.minus(origin);
                            const flat = WorldCombat.point(delta.x(), 0, delta.z());
                            if (flat.length() > 0.05) scope.hitDisplace(victim, flat.unit().scale(push));
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), psyshockHitText, [], 24);
                        }
                    }
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                if (!impacted && !walled) {
                    WorldFeedback.emit(scope, psyshockScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.0, 0)), psyshockMissText, [], 20);
                }
                finish(current);
            });
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, vanes: vanes, scale: scale, intensity: intensity });
        }
    });

    // 原生 `overrideDefensiveStat: def`：伤害段 spec 的 defenceStat 让预览与命中都按目标物理防御结算；
    // 攻方仍用特攻与特殊类别，相性、暴击、本系与攻方特性道具仍走共享结算。只对本招生效。
}
