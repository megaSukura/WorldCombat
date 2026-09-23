/**
 * 珍藏 / lastresort 的出手方式。
 *
 * 核心念头：把所有别的本事都用过一遍之后，才轮到掏出来的那一记——慢慢站定、把整副身板压上去，
 *   直直撞出全组最慢也最重的一下；自己伤得越重，这一下越狠。它是「先付出、后兑现」的那一端：
 *   要先走完其他每一招，这份珍藏才亮起来；一旦打出，账本清空，要重新攒。
 *
 * 三幕：
 *   起（windup，提交前）：站定沉腰，脚下浮起金白的光环；已损失的生命把光环点得更亮（present gather / whiff）。
 *   撞（charge → slam／miss）：提交后沿瞄准方向直撞，trace 撞上活体即结算 trump 接触伤害，并把目标狠狠顶开；
 *       一路撞空则收势落空。
 *
 * 与同族分开：
 *   迎头一击也重，但只在刚上场那一瞬、且不看伤势；珍藏慢得多，只有在用遍其他招之后才能掏，并且血越少越重。
 *   头锤是随时可用的短冷却近战；珍藏是一整场才可能掏一次的资源。
 */
namespace PokemonSkills {
    const lastresortHitText = "world_combat.move.lastresort.text.hit";
    const lastresortMissText = "world_combat.move.lastresort.text.miss";
    const lastresortWoundText = "world_combat.move.lastresort.text.wound";

    define({
        freeMovement: true,
        id: lastresortId,
        cooldownParameter: "recharge",
        name: "Last Resort",
        description: "压箱底的一记直撞：只有把招式表里其他已实装的招都用过一遍之后才解锁；出手极慢、份量全组最重，并且自己伤得越重这一记越狠。打出之后账本清空，要重新攒一轮。",
        uses: ["把所有招走一遍后掏出压箱底的一记", "残血时打出最重的直撞",
               "把攒下的出场机会换成一次决胜"],
        kind: "enemy",
        range: 3.4,
        maxRange: 6,
        prepare: 9,
        active: 0,
        recover: 9,
        cooldown: 36,
        style: "contact",
        defaults: { desperation: false, ai: { maxChase: 9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(lastresortId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "contact", color: 0xE8C56A,
                label: config && config.desperation === true ? "珍藏·背水" : "珍藏" };
        },
        ready: function (action) {
            return lastresortUnlocked(action.sense(), action.actor()) ? "" : "skill-unavailable";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[lastresortId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(lastresortId, "tempo", context)),
                recover: Math.round(p(lastresortId, "settle", context)),
                cooldown: Math.round(p(lastresortId, "recharge", context)),
                active: 0,
                range: p(lastresortId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            const wound = body === null ? 0 : Math.max(0, Math.min(1, 1 - body.health() / Math.max(1, body.maxHealth())));
            const power = lastresortUnlocked(world, actor) ? p(lastresortId, "trump", action) : 0;
            action.present("lastresort:gather", lastresortScene, 1, action.origin(),
                JSON.stringify({ moment: power > 0 ? "gather" : "whiff", wound: wound, bright: 0.35 + wound * 0.55,
                    orbs: Math.round(10 + wound * 40 + Math.max(0, power - 80) / 4),
                    desperation: config && config.desperation === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(lastresortScene);
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const length = p(lastresortId, "dash", action);
            const step = p(lastresortId, "speed", action);
            const radius = p(lastresortId, "collisionRadius", action);
            const power = p(lastresortId, "trump", action);
            const push = p(lastresortId, "push", action);
            const scale = radius / 0.5;
            const count = Math.round(26 + power * 0.4);
            const body = world.observe(actor);
            const wound = body === null ? 0 : Math.max(0, Math.min(1, 1 - body.health() / Math.max(1, body.maxHealth())));
            let travelled = 0;

            sound(action, "minecraft:entity.iron_golem.attack");
            movementScenes.show(action, "charge", action.origin(), { moment: "charge", scale: scale, count: count, wound: wound,
                    direction: [direction.x(), direction.y(), direction.z()] });

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, lastresortScene, 1, at, { moment: "miss", scale: scale }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), lastresortMissText, [], 24);
                scope.sound("minecraft:entity.player.attack.sweep", at, 14, "{}");
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, lastresortId, power,
                            { damage: damageSpec(lastresortId, "trump"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, lastresortScene, 1, hit.position(),
                            { moment: "slam", target: String(victim.ref()), count: count, scale: scale,
                                wound: wound, bright: 0.4 + wound * 0.5, power: Math.round(power * 10) / 10 }, 34);
                        scope.sound("cobblemon:impact.normal", hit.position(), 16, "{}");
                        if (landed) WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.2, 0)),
                            wound > 0.5 ? lastresortWoundText : lastresortHitText, [Math.round(power)], 28);
                    }
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p(lastresortId, "minimumMove", current) || travelled >= length) {
                    whiff(current, current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
