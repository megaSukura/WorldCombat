/**
 * 精神利刃 / psychocut 的出手方式。
 *
 * 核心念头：在身前凝出一把实体化的心之利刃——一轮偏紫的月牙——掷出去；刃脱手后自己修正方向追向目标，
 * 命中处沿竖直面切出一个十字，把目标钉在交点上，刃风扫到近旁的其他敌人也各挨一记。它是本族里唯一
 * 「刃离开施法者、还会拐弯追人」的一击。
 *
 * 三幕：
 *   起（windup，提交前）：心意在身前收拢，只播预告，可被打断。
 *   掷（blade，提交后）：月牙脱手沿目标方向飞出，追着目标拐弯；飞行中拖着刃尾。
 *   裂（cleave → echo）：命中时在落点切出一个十字（两道交叉的亮线），主目标吃满 `blade`，十字半径内
 *       其他非友方各吃 `echo` 比例的刃风；落空则月牙飞到尽头自行散去。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的十字闪。
 *
 * 与同族分开：水波刀是一道笔直、极快、细窄的水线，能贯穿成排的目标；精神利刃是一轮更宽、会拐弯追人的
 * 月牙，命中切出一个面（十字）而不是一条线。玩家从「慢一些、会拐弯、命中成十字」把它认出来。
 */
namespace PokemonSkills {
    /** 命中处的十字：两条交叉的斜线，撑起一个竖直面上的叉，供判定范围与表现共用。 */
    function psychocutCross(point: CombatPoint, direction: CombatPoint, half: number, vertical: number): number[][][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const up = WorldCombat.point(0, 1, 0);
        const a = point.plus(side.scale(-half)).plus(up.scale(-vertical));
        const b = point.plus(side.scale(half)).plus(up.scale(vertical));
        const c = point.plus(side.scale(-half)).plus(up.scale(vertical));
        const d = point.plus(side.scale(half)).plus(up.scale(-vertical));
        return [[[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()]], [[c.x(), c.y(), c.z()], [d.x(), d.y(), d.z()]]];
    }

    define({
        id: psychocutId,
        cooldownParameter: "recharge",
        name: "Psycho Cut",
        description: "在身前凝出一把实体化的心之刃，掷出去后它自己拐弯追向目标：命中处沿竖直面切出一个十字，把目标钉在交点上，刃风扫到近旁的其他敌人也各挨一记。它是一记会追人的远程斩击，暴击率比同族高一档。",
        uses: ["把实体化的心之刃掷出去", "刃会拐弯追向目标", "命中处切出一个十字，波及近旁的敌人"],
        kind: "enemy",
        range: 9,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 28,
        style: "psychic",
        defaults: { keen: false, ai: { maxChase: 13, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(psychocutId, "arc", pokemon), geometry: "area", style: "psychic", color: 0xB57BE8,
                label: config && config.keen === true ? "凝刃" : "精神利刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[psychocutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(psychocutId, "tempo", context)),
                recover: Math.round(p(psychocutId, "aftercast", context)),
                cooldown: Math.round(p(psychocutId, "recharge", context)),
                active: 0,
                range: p(psychocutId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychocut:windup", psychocutScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", keen: config && config.keen === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const direction = aim(action);
            const power = p(psychocutId, "blade", action);
            const speed = p(psychocutId, "flight", action);
            const reach = p(psychocutId, "reach", action);
            const arc = p(psychocutId, "arc", action);
            const guide = Math.round(p(psychocutId, "guide", action));
            const echo = p(psychocutId, "echo", action);
            const radius = p(psychocutId, "radius", action);
            const shards = Math.max(8, Math.round(p(psychocutId, "shards", action)));
            const cap = Math.max(1, Math.round(p(psychocutId, "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(2.0, arc / psychocutReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            let settled = false;

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/cut", tint: 0xB57BE8, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.35))
            };
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: guide, delay: 2, range: reach };

            sound(action, "minecraft:item.trident.throw");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 220,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || settled) return;
                    settled = true;
                    const landed = impact(current, hit, psychocutId, power,
                        { damage: damageSpec(psychocutId, "blade"), slice: true });
                    sound(current, "cobblemon:impact.psychic");
                    const cross = psychocutCross(point, direction, arc, arc * 0.95);
                    for (let index = 0; index < cross.length; index++)
                        WorldFeedback.emit(scope, psychocutScene, 1, point,
                            { moment: "cleave", target: String(victim.ref()), path: cross[index], shards: shards,
                                scale: scale, intensity: intensity }, 24);
                    // 刃风波及：十字半径内的其他非友方各吃一份 echo 比例的伤害。
                    let extra = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, arc, { below: 1.6, above: 2.6 }),
                        function (other, facts) {
                            if (extra >= cap - 1 || String(other.ref()) === String(victim.ref())) return;
                            if (!hurt(current, other, psychocutId, power * echo,
                                { damage: damageSpec(psychocutId, "blade"), slice: true })) return;
                            extra++;
                            WorldFeedback.emit(scope, psychocutScene, 1, facts.position(),
                                { moment: "echo", target: String(other.ref()), scale: scale, intensity: intensity * 0.8 }, 18);
                        });
                    if (landed) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), psychocutCutText, [extra], 26);
                    done(current);
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                WorldFeedback.emit(scope, psychocutScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), psychocutMissText, [], 20);
                done(current);
            });
            WorldFeedback.keep(world, "psychocut:flight:" + action.id(), psychocutScene, 1, action.origin(),
                { moment: "blade", projectile: flight, scale: scale, intensity: intensity }, 120);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的十字闪与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_psychocut/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== psychocutId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, psychocutScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(10, Math.min(46, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), psychocutVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
