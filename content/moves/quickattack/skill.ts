/**
 * 电光一闪 / quickattack 的出手方式。
 *
 * 核心念头：一道贴地的直线影子冲过短短一段距离，在对手还没把动作摆出来之前先撞上——点到为止，撞上就停。
 *   它是全族最短、最快、最便宜的一记先制，不图一次打重，只图「先到」。
 *
 * 两幕：
 *   起（windup，提交前）：压低身子、脚下卷起一小股尘与速度线，只播预告（present coil）。
 *   冲（execute）：提交后沿瞄准方向逐刻推进，身后拖一条浅色速度线；撞上第一个非友方活体就结算 strike
 *       接触伤害、把它顶开一点、随即停住收势（strike）；一路冲到尽头没撞上就收势落空（miss）。
 *
 * 与同族分开：撞击是助跑后整个身体撞上去、顺冲势从身侧滑过（有 carry）；电光一闪不滑过、不贯穿，
 *   撞上就停。神速则是约两倍距离、贯穿并停到身后、冲击重得多的那一记。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: quickattackId,
        cooldownParameter: "recharge",
        name: "Quick Attack",
        description: "压低身子，贴地射出一小段直线，在对手还没把动作摆出来之前先撞上——撞上就停，收势极快。距离短、冷却低、没有附带效果，是随时能出的便宜先制。抢拍式更快更远但更轻、更费。",
        uses: ["贴身抢一记先手，趁对手还没出手", "低代价地收掉残血目标", "追不上时用一记短冲把距离补上"],
        kind: "enemy",
        range: 2.7,
        maxRange: 4.8,
        prepare: 2,
        active: 0,
        recover: 5,
        cooldown: 16,
        style: "speed",
        defaults: { eager: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(quickattackId, "dash", pokemon) : 2.7) + 0.4, geometry: "line", style: "speed", color: 0xFFF0C8,
                label: config && config.eager === true ? "电光一闪·抢拍" : "电光一闪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[quickattackId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(quickattackId, "tempo", context)),
                recover: Math.round(p(quickattackId, "settle", context)),
                cooldown: Math.round(p(quickattackId, "recharge", context)),
                active: 0,
                range: p(quickattackId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("quickattack:coil", quickattackScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, eager: config && config.eager === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(quickattackId, "dash", action);
            const step = p(quickattackId, "pace", action);
            const radius = p(quickattackId, "collisionRadius", action);
            const power = p(quickattackId, "strike", action);
            const push = p(quickattackId, "push", action);
            const streak = Math.max(8, Math.round(p(quickattackId, "streak", action)));
            const count = Math.round(12 + power * 0.35);
            const scale = radius / 0.40;
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const eager = config && config.eager === true ? 1 : 0;
            let travelled = 0;

            sound(action, "cobblemon:move.quickattack.actor");
            WorldFeedback.emit(world, quickattackScene, 1, action.origin(),
                { moment: "dash", scale: scale, streak: streak, intensity: intensity, eager: eager }, 40);

            function finish(current: CombatAction, at: CombatPoint, moment: string, textKey: string): void {
                const scope = current.world();
                if (moment === "miss") WorldFeedback.emit(scope, quickattackScene, 1, at,
                    { moment: "miss", scale: scale, streak: streak }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), textKey, [], 22);
                scope.sound(moment === "miss" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal", at, 14, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(origin, origin.plus(delta.scale(p(quickattackId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, quickattackId, power,
                            { damage: damageSpec(quickattackId, "strike"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(origin);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, quickattackScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), count: count, scale: scale, intensity: intensity }, 26);
                        finish(current, hit.position(), "strike", quickattackHitText);
                    } else {
                        finish(current, origin.plus(delta), "miss", quickattackMissText);
                    }
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(quickattackId, "minimumMove", current) || travelled >= length) {
                    finish(current, origin.plus(delta), "miss", quickattackMissText);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
