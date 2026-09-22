/**
 * 气旋攻击 / aeroblast —— 注册与动作。
 *
 * 核心念头：把空气拧成一支高速旋转的涡流锥，笔直射出去；命中处炸开成向外的气环，主目标被冲开、
 *   环里的旁人也被扫到。它是四记里射程最远、单发最重的一击，也是唯一的专属招。
 *
 * 幕：
 *   起（windup，提交前）：空气在口边旋起、越拧越紧，只播预告，可被打断。
 *   射（projectile → flight）：提交后涡流锥沿瞄准方向飞出，身后拖着一圈圈螺旋气尾。
 *   爆（burst → echo）：命中时主目标吃满 `blast` 并被沿弹道推开 `push` 格；命中点炸出半径 `ring` 的气环，
 *       环内最多 `ringCap` 个其他非友方各吃 `echo` 比例的伤害。落空则涡流飞到尽头自行溃散。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的白色气环。
 */
namespace PokemonSkills {
    define({
        id: aeroblastId,
        name: "Aeroblast",
        description: "A vortex of air is shot at the target to inflict damage. This move has a heightened chance of landing a critical hit.",
        uses: ["把空气拧成一支涡流锥笔直射出去", "命中处炸成气环、把主目标冲开", "本族最远最重的一记单体远程"],
        kind: "enemy",
        range: 16,
        maxRange: 22,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 60,
        style: "air",
        defaults: { charge: false, ai: { maxChase: 20, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(aeroblastId, "reach", pokemon), geometry: "line", style: "air", color: 0xBFE8F0,
                label: config && config.charge === true ? "蓄力气旋攻击" : "气旋攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[aeroblastId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(aeroblastId, "tempo", context)),
                recover: Math.round(p(aeroblastId, "aftercast", context)),
                cooldown: Math.round(p(aeroblastId, "recharge", context)),
                active: 0,
                range: p(aeroblastId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aeroblast:charge", aeroblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: config && config.charge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const power = p(aeroblastId, "blast", action);
            const reach = p(aeroblastId, "reach", action);
            const speed = p(aeroblastId, "flight", action);
            const radius = p(aeroblastId, "radius", action);
            const ring = p(aeroblastId, "ring", action);
            const echo = p(aeroblastId, "echo", action);
            const push = p(aeroblastId, "push", action);
            const spiral = Math.max(12, Math.round(p(aeroblastId, "spiral", action)));
            const cap = Math.max(0, Math.round(p(aeroblastId, "ringCap", action)));
            const scale = Math.max(0.6, Math.min(2.2, reach / aeroblastReference));
            const intensity = Math.max(0.6, Math.min(2.6, power / 100));
            let settled = false;

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/swirlingwind", tint: 0xCFEFF5, glow: true,
                scale: Math.max(0.7, Math.min(1.8, radius / 0.5))
            };

            sound(action, "minecraft:entity.breeze.shoot");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), gravity: 0, radius: radius, lifetime: 220,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (settled || victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    settled = true;
                    const landed = impact(current, hit, aeroblastId, power,
                        { damage: damageSpec(aeroblastId, "blast") });
                    const body = scope.observe(actor);
                    if (landed) {
                        const away = body === null ? null : point.minus(body.position());
                        if (away !== null && away.length() > 0.01) scope.displace(victim, away.unit().scale(push));
                    }
                    WorldFeedback.emit(scope, aeroblastScene, 1, point,
                        { moment: "burst", target: String(victim.ref()), ring: ring, spiral: spiral,
                            intensity: intensity }, 28);
                    let extra = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, ring, { below: 1.8, above: 3.0 }),
                        function (other, facts) {
                            if (extra >= cap || String(other.ref()) === String(victim.ref())) return;
                            if (!hurt(current, other, aeroblastId, power * echo,
                                { damage: damageSpec(aeroblastId, "blast") })) return;
                            extra++;
                            WorldFeedback.emit(scope, aeroblastScene, 1, facts.position(),
                                { moment: "echo", target: String(other.ref()), scale: scale,
                                    intensity: intensity * 0.8 }, 20);
                        });
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), aeroblastBurstText,
                        extra > 0 ? [extra] : [], 28);
                    sound(current, "minecraft:entity.breeze.wind_burst");
                    done(current);
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                WorldFeedback.emit(scope, aeroblastScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), aeroblastMissText, [], 22);
                done(current);
            });
            WorldFeedback.keep(world, "aeroblast:flight:" + action.id(), aeroblastScene, 1, action.origin(),
                { moment: "flight", projectile: flight, spiral: spiral, radius: radius, ring: ring,
                    scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] }, 160);
            sound(action, "cobblemon:move.gust.actor");
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的白色气环与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_aeroblast/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== aeroblastId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 16;
        WorldFeedback.emit(world, aeroblastScene, 1, at,
            { moment: "crit", target: String(target.ref()), spiral: Math.max(20, Math.min(80, Math.round(ratio * 5))),
                ring: Math.max(1.6, Math.min(4.5, ratio * 2)) }, 26);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), aeroblastCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
