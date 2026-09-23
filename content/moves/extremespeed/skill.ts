/**
 * 神速 / extremespeed 的出手方式。
 *
 * 核心念头：一道长到看不见中间过程的直线——整个人像被抽掉一样射出去，撞上活体是这一族最重的一记，
 *   并把它狠狠顶开；默认还会从对方身上穿过去，再冲一小段停在它身后。它同时是一招换位手段。
 *
 * 两幕：
 *   起（windup，提交前）：全身绷直、地面被蹬出一道白环、残影开始拉长，只播预告（present coil）。
 *   冲（execute）：提交后沿瞄准方向逐刻推进，身后铺一整条残影；撞上第一个非友方活体就结算 ram 接触伤害、
 *       把它顶开并在接触点炸开一记重击（ram）；贯穿式随即从它身上穿过、再冲 `carry` 格停在身后（through），
 *       重撞式则撞中即停；一路冲到尽头没撞上就收势落空（miss）。
 *
 * 与同族分开：电光一闪距离约一半、点到为止、冷却低；神速距离最长、最快、最重、贯穿换位、冷却最久。
 *   与水流喷射分开：神速没有水柱与浇透，只有一整条残影与一记贯穿的重撞。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: extremespeedId,
        cooldownParameter: "recharge",
        name: "Extreme Speed",
        description: "一道长到看不见中间过程的直线射出去：起手最低瞬发、速度与射程全族最高，撞上活体是这一族最重的一记，并把它狠狠顶开。默认贯穿式还会从对方身上穿过去、再冲一段停在它身后，用来换位。它同时是一招要挑时机的重击——冷却全族最长。",
        uses: ["中远距离一记重撞收尾", "从对手身上穿过去换到它身后", "追上逃跑的对手"],
        kind: "enemy",
        range: 5.2,
        maxRange: 8.0,
        prepare: 1,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "rush",
        defaults: { overrun: true, ai: { maxChase: 11, finish: true, catch: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(extremespeedId, "burst", pokemon) : 5.2) + 0.5, geometry: "line", style: "rush", color: 0xBFC8FF,
                label: config && config.overrun === true ? "神速·贯穿" : "神速·重撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[extremespeedId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(extremespeedId, "tempo", context)),
                recover: Math.round(p(extremespeedId, "settle", context)),
                cooldown: Math.round(p(extremespeedId, "recharge", context)),
                active: 0,
                range: p(extremespeedId, "burst", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("extremespeed:charge", extremespeedScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, overrun: config && config.overrun === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(extremespeedScene);
            const world = action.world();
            const direction = aim(action);
            const length = p(extremespeedId, "burst", action);
            const step = p(extremespeedId, "pace", action);
            const radius = p(extremespeedId, "collisionRadius", action);
            const power = p(extremespeedId, "ram", action);
            const push = p(extremespeedId, "push", action);
            const carry = p(extremespeedId, "carry", action);
            const wake = Math.max(4, Math.round(p(extremespeedId, "wake", action)));
            const overrun = config && config.overrun === true;
            const count = Math.round(20 + power * 0.4);
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.2, power / 85));
            let travelled = 0;

            sound(action, "cobblemon:move.quickattack.actor");
            movementScenes.show(action, "leap", action.origin(), { moment: "leap", scale: scale, wake: wake, intensity: intensity, overrun: overrun ? 1 : 0 });

            function conclude(current: CombatAction, moment: string, textKey: string, at: CombatPoint): void {
                const scope = current.world();
                if (moment === "miss") WorldFeedback.emit(scope, extremespeedScene, 1, at,
                    { moment: "miss", scale: scale, wake: wake }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), textKey, [], 24);
                scope.sound(moment === "miss" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.normal", at, 16, "{}");
                movementScenes.finish(current, done);
            }

            function carryOn(current: CombatAction, remaining: number, elapsed: number, at: CombatPoint): void {
                if (remaining <= 0.02 || elapsed >= 10) { conclude(current, "ram", extremespeedHitText, at); return; }
                const scope = current.world();
                const moved = scope.displace(current.actor(), direction.scale(Math.min(step * 0.6, remaining)));
                if (moved < p(extremespeedId, "minimumMove", current)) { conclude(current, "ram", extremespeedHitText, at); return; }
                current.after(1, function (next: CombatAction) { carryOn(next, remaining - moved, elapsed + 1, at); });
            }

            function ram(current: CombatAction, hit: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                WorldFeedback.emit(scope, extremespeedScene, 1, hit.position(),
                    { moment: "ram", target: String(victim.ref()), count: count, scale: scale, intensity: intensity }, 30);
                scope.sound("minecraft:entity.player.attack.strong", hit.position(), 16, "{}");
                const landed = impact(current, hit, extremespeedId, power,
                    { damage: damageSpec(extremespeedId, "ram"), contact: true });
                if (landed && scope.valid(victim)) {
                    const away = hit.position().minus(current.origin());
                    if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                }
                if (!overrun || carry <= 0.02) { conclude(current, "ram", extremespeedHitText, hit.position()); return; }
                movementScenes.stop(current, "leap");
                movementScenes.show(current, "through", hit.position(), { moment: "through", target: String(victim.ref()), carry: carry, wake: wake, scale: scale });
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.15, 0)), extremespeedThroughText, [], 22);
                carryOn(current, carry, 0, hit.position());
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) { ram(current, hit, victim); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p(extremespeedId, "minimumMove", current) || travelled >= length) {
                    conclude(current, "miss", extremespeedMissText, current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
