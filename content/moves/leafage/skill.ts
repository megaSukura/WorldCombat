/**
 * 树叶 / leafage 的出手方式。
 *
 * 核心念头：**随手抖下一把嫩叶，朝对手张成一个小扇面撒出去**——叶各走一条短弧，最先扎中的那一片算数，
 *   没扎中的旋落在落点积成一小撮绿屑。它是草系最便宜、最快的一记：起手极短、回得也快。
 *
 * 一幕（提交前只播预告）：
 *   起（gather，提交前）：肩侧抖下一撮叶、叶朝身前收拢，只播预告，可被打断。
 *   撒（execute → flight × count → hit / land）：提交后把 `count` 片叶沿瞄准方向张成 `spread` 度的扇面撒出；
 *     每片叶随自己的弹体走小弧；第一片碰到活物即结算一次 `toss` 物理伤害并在命中点炸成碎叶；
 *     其余叶片继续飞、碰地就在落点迸一小撮绿屑。全部落地后收势。
 *
 * 与同族分开：飞叶快刀是沿同一窄带连发多波；魔法叶是会拐弯追人的一群；叶刃是接触的一记重斩；
 *   树叶只撒一把、走短弧，玩家凭「一小撮叶随手一撒」认出它。
 *
 * 配置 `heavy`（重叶式）由 resolve 改时序、由公式改威力／叶数／判定／射程；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 扇面里第 index 片叶（共 count 片）的瞄准方向：以基准角为中轴均匀张开。 */
    function leafageFanDirection(direction: CombatPoint, index: number, count: number, spreadDegrees: number): CombatPoint {
        const base = Math.atan2(direction.x(), direction.z());
        const t = count <= 1 ? 0 : index / (count - 1) - 0.5;
        const angle = base + t * spreadDegrees * Math.PI / 180;
        return WorldCombat.point(Math.sin(angle), 0.06, Math.cos(angle)).unit();
    }

    define({
        id: leafageId,
        cooldownParameter: "recharge",
        name: "Leafage",
        description: "抖下一把嫩叶，沿瞄准方向张成一个小扇面撒出去：叶子各走一条短弧，最先扎中的那一片造成伤害，其余的旋落在落点。它便宜、出手极短、回得快；重叶式叶少而重、撒得更远，疾撒式叶多而轻、压住走位。",
        uses: ["便宜、快速的远程消耗，一记接一记地撒", "用一片扇叶兜住来回走位的对手", "在近距离补最后一下"],
        kind: "enemy",
        range: 7,
        maxRange: 12,
        prepare: 4,
        active: 0,
        recover: 3,
        cooldown: 13,
        style: "leaf",
        defaults: { heavy: false, ai: { maxChase: 11, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(leafageId, "reach", pokemon), geometry: "cone", style: "leaf", color: 0x9BD25A,
                label: config && config.heavy === true ? "重叶式" : "疾撒式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[leafageId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(leafageId, "tempo", context)),
                recover: Math.round(p(leafageId, "aftercast", context)),
                cooldown: Math.round(p(leafageId, "recharge", context)),
                active: 0,
                range: p(leafageId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const count = Math.max(3, Math.round(p(leafageId, "count", action)));
            action.present("world_combat:leafage:gather", leafageScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", heavy: config && config.heavy === true ? 1 : 0, leaves: count }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(leafageId, "toss", action);
            const count = Math.max(3, Math.round(p(leafageId, "count", action)));
            const speed = Math.max(0.8, p(leafageId, "velocity", action));
            const radius = Math.max(0.14, p(leafageId, "leafRadius", action));
            const reach = Math.max(4, p(leafageId, "reach", action));
            const spread = Math.max(8, p(leafageId, "spread", action));
            const scale = Math.max(0.6, Math.min(1.8, radius / leafageReference));
            const intensity = Math.max(0.6, Math.min(2.0, power / 32));
            const direction = aim(action);
            let landed = false, remaining = count, settled = false;
            function finish(current: CombatAction): void {
                if (settled || remaining > 0) return;
                settled = true;
                const scope = current.world(), body = scope.observe(current.actor());
                if (!landed && body !== null) {
                    WorldFeedback.emit(scope, leafageScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.05, 0)), leafageMissText, [], 20);
                }
                done(current);
            }
            function complete(current: CombatAction): void { remaining--; finish(current); }

            sound(action, "cobblemon:move.razorleaf.actor_1");
            for (let index = 0; index < count; index++) {
                const shot = leafageFanDirection(direction, index, count, spread);
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: reach + 2, radius: radius, direction: shot, gravity: 0.035, lifetime: 80,
                    appearance: { sprite: "cobblemon:particle/generic/grass/leaf", tint: 0x9BD25A, glow: false, scale: scale },
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const scope = current.world(), who = hit.target(), at = hit.position();
                        if (who === null) {
                            WorldFeedback.emit(scope, leafageScene, 1, at,
                                { moment: "land", leaves: Math.max(2, Math.round(count * 0.35)), scale: scale }, 26);
                            return;
                        }
                        if (!scope.valid(who) || scope.friendly(who) || landed) return;
                        landed = true;
                        if (!impact(current, hit, leafageId, power, { damage: damageSpec(leafageId, "toss") })) return;
                        WorldFeedback.emit(scope, leafageScene, 1, at,
                            { moment: "hit", target: String(who.ref()), leaves: count, scale: scale, intensity: intensity }, 20);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), leafageHitText, [], 20);
                        sound(current, "cobblemon:impact.grass");
                    }
                }, function (current: CombatAction) { complete(current); });
                WorldFeedback.emit(world, leafageScene, 1, action.origin(),
                    { moment: "flight", projectile: flight, leaves: count, scale: scale, intensity: intensity }, 40);
            }
            WorldFeedback.emit(world, leafageScene, 1, action.origin(),
                { moment: "toss", direction: [direction.x(), direction.y(), direction.z()], spread: spread,
                  leaves: count, scale: scale, intensity: intensity }, 16);
        }
    });
}
