/**
 * 妖精之风 / fairywind 的出手方式。
 *
 * 核心念头：**抖身卷起一阵打着旋、裹着香粉的暖风**——它从身侧卷起，沿瞄准方向旋转着扑出去，穿过一个又
 *   一个对手而不停在第一个身上；每个被扫到的对手挨一记特殊伤害，再被旋向甩到一侧。风散时在尽头留下一圈
 *   粉色香尘。它轻、快、射程中等，是妖精系里最顺手的远程消耗。
 *
 * 两幕（提交前只播预告）：
 *   起（gather，提交前）：香风在身侧卷成一小柱、越转越快，只播预告，可被打断。
 *   旋（execute → flight → hit × n → dissipate / miss）：提交后风沿瞄准方向扑出，可穿过 `pierce` 个额外目标；
 *      每个被扫到的非友方结算一次 `gale` 特殊伤害，并沿旋向被甩到风的侧面；风走完射程散成一圈香尘，
 *      整条线没人被扫到则只留一圈空尘。
 *
 * 与同族分开：起风是一发即散、沿风推人的小风团；银色旋风是一大片铺开的扇面；预兆之风会追人再炸；
 *   妖精之风只走直线，但**穿过一串对手、逐个甩向侧面**，玩家凭「一阵风把人撩开又继续走」认出它。
 *
 * 配置 `wide`（广旋式）由 resolve 改时序、由公式改判定／贯穿／侧甩／威力；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: fairywindId,
        name: "Fairy Wind",
        description: "抖身卷起一阵打着旋的香风，沿瞄准方向扑出去：风会穿过一个又一个对手而不停下，每个被扫到的都被甩到风的侧面。广旋式扫得更宽、穿得更多、甩得更开，但单次更轻、更慢；轻掠式更细更利、出手更快。",
        uses: ["一条直线扫过并排站着的几个对手", "把冲上来的目标甩离自己的正面", "远距离先手，用风把对手推离掩体"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 6,
        active: 0,
        recover: 5,
        cooldown: 16,
        style: "fairywind",
        defaults: { wide: false, ai: { maxChase: 13, through: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(fairywindId, "reach", pokemon), geometry: "line", style: "fairywind", color: 0xF0A8D0,
                label: config && config.wide === true ? "广旋式" : "轻掠式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[fairywindId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(fairywindId, "tempo", context)),
                recover: Math.round(p(fairywindId, "aftercast", context)),
                cooldown: Math.round(p(fairywindId, "recharge", context)),
                active: 0,
                range: p(fairywindId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(12, Math.round(p(fairywindId, "motes", action)));
            action.present("world_combat:fairywind:gather", fairywindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", wide: config && config.wide === true ? 1 : 0, motes: motes }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(fairywindId, "gale", action);
            const speed = Math.max(0.8, p(fairywindId, "flight", action));
            const radius = Math.max(0.2, p(fairywindId, "radius", action));
            const reach = Math.max(5, p(fairywindId, "reach", action));
            const cap = Math.max(0, Math.round(p(fairywindId, "pierce", action)));
            const fling = Math.max(0, p(fairywindId, "fling", action));
            const motes = Math.max(12, Math.round(p(fairywindId, "motes", action)));
            const direction = aim(action);
            const side = WorldCombat.point(-direction.z(), 0, direction.x()).unit();
            const scale = Math.max(0.6, Math.min(2.0, radius / fairywindReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 38));
            let settled = false, hits = 0;

            function finish(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, fairywindScene, 1, at,
                    { moment: hits > 0 ? "dissipate" : "miss", motes: Math.round(motes * 0.6), scale: scale, intensity: intensity }, 22);
                if (hits === 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.7, 0)), fairywindMissText, [], 20);
                done(current);
            }

            sound(action, "cobblemon:move.gust.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/swirlingwind", tint: 0xF0A8D0, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.3)),
                pierce: cap
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, gravity: 0, radius: radius, lifetime: 160,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim) || hits > cap) return;
                    if (!impact(current, hit, fairywindId, power, { damage: damageSpec(fairywindId, "gale"), flags: { wind: true } })) return;
                    hits++;
                    const spin = hits % 2 === 0 ? 1 : -1;
                    if (scope.valid(victim)) scope.displace(victim, side.scale(fling * spin));
                    WorldFeedback.emit(scope, fairywindScene, 1, at,
                        { moment: "hit", target: String(victim.ref()), motes: motes, hits: hits, spin: spin,
                          fling: fling, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), fairywindHitText, [hits], 20);
                    sound(current, "cobblemon:impact.fairy");
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                finish(current, current.targetPosition());
            });
            WorldFeedback.keep(world, "fairywind:flight:" + action.id(), fairywindScene, 1, action.origin(),
                { moment: "flight", projectile: flight, motes: motes, scale: scale, intensity: intensity }, 140);
        }
    });
}
