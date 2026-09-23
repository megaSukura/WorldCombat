/**
 * 迎头一击 / firstimpression 的出手方式。
 *
 * 核心念头：被放上场的那一瞬间，不给对手任何准备，整段身体像一发虫甲炮弹砸过去——第一次起飞就是最重的一下，
 *   也只砸得出这一下。它和击掌奇袭共用一个时机，但那份时机换来的是全组最重的开场重击，而不是打断。
 *
 * 三幕：
 *   起（windup，提交前）：弓身蓄势，脚下泛起虫绿的蓄力纹；不是刚出场就只作空起势（present coil / whiff）。
 *   扑（dive）：提交后沿瞄准方向整段扑出，身后拖出绿色速度线。
 *   砸（crash）：撞上活体即结算 slam 接触伤害，并把人沿冲势狠狠顶开；一路撞空则收势落空（miss）。
 *
 * 与同族分开：
 *   击掌奇袭同样只认「刚出场」，但那一记轻、快、只求拍懵；迎头一击慢半拍、没有懵，要的是开场一下把人打残。
 *   头锤是随时能用的短冷却近战；迎头一击一辈子只在刚上场时砸一次，份量也重得多。
 */
namespace PokemonSkills {
    const firstimpressionHitText = "world_combat.move.firstimpression.text.hit";
    const firstimpressionMissText = "world_combat.move.firstimpression.text.miss";

    define({
        freeMovement: true,
        id: firstimpressionId,
        cooldownParameter: "recharge",
        name: "First Impression",
        description: "刚被放上场时整段身体扑出去的一记虫甲重砸：出手极快、份量全组最重，撞上就把对手狠狠顶开；一旦自己已经出过手，就要等重新算作「刚出场」才能再砸。",
        uses: ["刚上场就砸出一记最重的扑击", "开场一下把对手打残",
               "趁对手还没反应过来把它顶到墙角"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.8,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 36,
        style: "contact",
        defaults: { reckless: false, ai: { maxChase: 7 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(firstimpressionId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "contact", color: 0x9BC24B,
                label: config && config.reckless === true ? "迎头一击·舍身" : "迎头一击" };
        },
        ready: function (action) {
            return firstimpressionFresh(action.sense(), action.actor()) ? "" : "skill-unavailable";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[firstimpressionId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(firstimpressionId, "tempo", context)),
                recover: Math.round(p(firstimpressionId, "settle", context)),
                cooldown: Math.round(p(firstimpressionId, "recharge", context)),
                active: 0,
                range: p(firstimpressionId, "leap", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const fresh = firstimpressionFresh(action.sense(), action.actor());
            action.present("firstimpression:coil", firstimpressionScene, 1, action.origin(),
                JSON.stringify({ moment: fresh ? "coil" : "whiff", reckless: config && config.reckless === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(firstimpressionId, "leap", action);
            const step = p(firstimpressionId, "speed", action);
            const radius = p(firstimpressionId, "collisionRadius", action);
            const power = p(firstimpressionId, "slam", action);
            const push = p(firstimpressionId, "push", action);
            const scale = radius / 0.44;
            const count = Math.round(22 + power * 0.32);
            let travelled = 0;

            sound(action, "cobblemon:move.quickattack.actor");
            WorldFeedback.emit(world, firstimpressionScene, 1, action.origin(),
                { moment: "dive", scale: scale, count: count, stride: Math.max(3, Math.round(length / 0.7)) }, 40);

            function land(current: CombatAction, moment: string, textKey: string): void {
                const scope = current.world(), here = current.origin();
                WorldFeedback.emit(scope, firstimpressionScene, 1, here, { moment: moment, scale: scale }, moment === "miss" ? 22 : 26);
                WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.1, 0)), textKey, [], 24);
                scope.sound(moment === "miss" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.bug", here, 16, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(firstimpressionId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, firstimpressionId, power,
                            { damage: damageSpec(firstimpressionId, "slam"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, firstimpressionScene, 1, hit.position(),
                            { moment: "crash", target: String(victim.ref()), count: count, scale: scale,
                                power: Math.round(power * 10) / 10 }, 30);
                        if (landed) WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), firstimpressionHitText,
                            [Math.round(power)], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(firstimpressionId, "minimumMove", current) || travelled >= length) {
                    land(current, "miss", firstimpressionMissText);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
