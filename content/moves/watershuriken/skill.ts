/**
 * 飞水手里剑 / watershuriken 的出手方式。
 *
 * 核心念头：在掌中搓出旋转的水盘，一枚接一枚沿直线甩出去——每一枚独立切一次、独立挂上水痕。
 *   甩几枚由精灵数据决定（等级、特攻、速度），所以两只精灵手里能看出不同的枚数；它是全族唯一的特殊招与连发。
 *
 * 两幕：
 *   起（windup，提交前）：水在掌中旋成盘、越攒越亮，只播预告（present gather）。
 *   掷（execute）：提交后按 `gap` 刻一枚一枚甩出（每枚带 `spread` 偏角）：命中非友方活体就结算一枚 `shuriken`
 *       特殊伤害并把目标浇透（共享身份 soaked）；甩满 `stars` 枚或目标离场就收势（settle）。
 *
 * 与同族分开：岩石爆击是弧线物理、砸地留碎石；飞水手里剑是直线特殊、水星旋转、不碰地面，飞行更快、按枚数连击。
 */
namespace PokemonSkills {
    /** 把瞄准方向绕世界 Y 轴偏一个角度，做出水星之间的散布。 */
    function watershurikenScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: watershurikenId,
        cooldownParameter: "recharge",
        name: "Water Shuriken",
        description: "The user throws throwing stars made of water. This move hits two to five times in a row. This move always goes first.",
        uses: ["中近距离连发的水星先手", "用多枚水星把目标浇透", "散式多甩几枚、聚式少而重"],
        kind: "enemy",
        range: 10,
        maxRange: 16,
        prepare: 3,
        active: 0,
        recover: 7,
        cooldown: 20,
        maximumTicks: 260,
        style: "jet",
        defaults: { focused: false, ai: { maxChase: 13, finish: true, preferDry: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(watershurikenId, "reach", pokemon) : 10, geometry: "line", style: "jet", color: 0x4FB8E8,
                label: config && config.focused === true ? "飞水手里剑·聚式" : "飞水手里剑·散式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[watershurikenId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(watershurikenId, "tempo", context)),
                recover: Math.round(p(watershurikenId, "settle", context)),
                cooldown: Math.round(p(watershurikenId, "recharge", context)),
                active: 0,
                range: p(watershurikenId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const stars = Math.max(2, Math.min(5, Math.round(p(watershurikenId, "stars", action))));
            action.present("watershuriken:gather", watershurikenScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, stars: stars, sparks: Math.round(p(watershurikenId, "sparks", action)),
                    focused: config && config.focused === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(watershurikenId, "shuriken", action);
            const stars = Math.max(2, Math.min(5, Math.round(p(watershurikenId, "stars", action))));
            const gap = Math.max(2, Math.round(p(watershurikenId, "gap", action)));
            const velocity = Math.max(0.4, p(watershurikenId, "velocity", action));
            const radius = Math.max(0.12, p(watershurikenId, "radius", action));
            const reach = Math.max(3, p(watershurikenId, "reach", action));
            const spread = Math.max(0, p(watershurikenId, "spread", action));
            const drench = Math.max(20, Math.round(p(watershurikenId, "drench", action)));
            const sparks = Math.max(10, Math.round(p(watershurikenId, "sparks", action)));
            const focused = !!(config && config.focused);
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.35));
            const intensity = Math.max(0.6, Math.min(2.2, power / 18));
            const flightTicks = Math.max(30, Math.round(reach / Math.max(0.3, velocity)) + 24);
            let shot = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(current.actor());
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, watershurikenScene, 1, at,
                    { moment: "settle", stars: stars, landed: landed, sparks: sparks, scale: scale }, 18);
                if (landed > 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), watershurikenTallyText, [landed, stars], 22);
                else WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), watershurikenMissText, [], 20);
                finish(current);
            }

            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= stars) { settle(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { settle(current); return; }
                const origin = current.origin();
                let direction = body.position().minus(origin);
                if (direction.length() < 0.05) direction = current.direction();
                direction = direction.unit();
                if (spread > 0.01) direction = watershurikenScatter(direction, (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const index = shot + 1;
                shot = index;
                sound(current, "cobblemon:move.watergun.actor");
                WorldFeedback.emit(scope, watershurikenScene, 1, origin,
                    { moment: "volley", index: index, stars: stars, sparks: sparks, scale: scale, intensity: intensity, focused: focused ? 1 : 0 }, 16);
                const flight = LivingActions.projectile(current, {
                    speed: velocity, range: Math.max(reach, current.range()), radius: radius, direction: direction,
                    lifetime: Math.max(20, Math.round(reach / Math.max(0.3, velocity)) + 18),
                    appearance: { sprite: "cobblemon:generic/star", tint: 0x6FC7EF, glow: true,
                        scale: Math.max(0.5, Math.min(1.2, radius / 0.35)) } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world(), at = hit.position(), struck = hit.target();
                        if (struck === null || !scope2.valid(struck) || scope2.friendly(struck)) return;
                        if (!impact(inner, hit, watershurikenId, power, { damage: damageSpec(watershurikenId, "shuriken") })) return;
                        landed++;
                        WorldFeedback.emit(scope2, watershurikenScene, 1, at,
                            { moment: "hit", target: String(struck.ref()), index: index, stars: stars, sparks: sparks, scale: scale, intensity: intensity }, 22);
                        scope2.sound("cobblemon:impact.water", at, 12, "{}");
                        if (scope2.valid(struck))
                            CombatStatus.apply(scope2, struck, "soaked", watershurikenSoakedEffect, drench, 0, { unique: true });
                    }
                }, function (inner: CombatAction) { inner.after(gap, function (next: CombatAction) { volley(next); }); });
                WorldFeedback.keep(scope, "watershuriken:fly:" + current.id() + ":" + index, watershurikenScene, 1, origin,
                    { moment: "fly", projectile: flight, sparks: sparks, scale: scale, intensity: intensity }, flightTicks);
            }

            sound(action, "minecraft:entity.arrow.shoot");
            volley(action);
        }
    });
}
