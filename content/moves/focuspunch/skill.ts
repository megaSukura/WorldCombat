/**
 * 真气拳 / focuspunch 的出手方式。
 *
 * 核心念头：把全身的气收进一只拳里，站定不动、任谁来都先扛着畏缩，等气满了再一步踏出，把攒了这么久的一击
 * 全砸在第一件挡路的东西上。它是本族最慢、最重、最怕被打断的一拳：收势本身就是招式的形状。
 *
 * 两幕：
 *   起（windup，提交前）：低身收势，把气从四周收进拳里；收得越久越亮（present brace）。同时把这次聚气的
 *       实例登记下来——聚气期间任何外来伤害都会打断它。
 *   击（execute）：聚满后沿瞄准方向短促踏进，撞上首个敌人即按 `punch` 结算接触+拳伤害并顶开；一路撞空则
 *       收势落空（whiff）。
 *
 * 与同族分开：双倍奉还/以牙还牙吃的是「被打过」，真气拳吃的是「没被打到」；只有它把胜负押在一段
 * 看得见、可被打断的长收势上。畏缩打不断收势（`interruptible: false`），伤害可以。
 */
namespace PokemonSkills {
    define({
        id: focuspunchId,
        name: "Focus Punch",
        description: "站定收势，把气聚进拳里；聚气期间挨到任何外来伤害都会让这一拳散去，聚满后踏进打出极重的一拳。",
        uses: ["在对手够不到时聚一记极重的拳", "惩罚被队友缠住、暂时打不到你的目标", "用长收势逼对手决定要不要贴上来"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.6,
        prepare: 38,
        active: 0,
        recover: 12,
        cooldown: 46,
        style: "punch",
        interruptible: false,
        defaults: { steady: false, ai: { maxChase: 8, patient: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(focuspunchId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "punch", color: 0xE6A23C,
                label: config && config.steady === true ? "真气拳·沉势" : "真气拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[focuspunchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(focuspunchId, "gather", context)),
                recover: Math.round(p(focuspunchId, "settle", context)),
                cooldown: Math.round(p(focuspunchId, "recharge", context)),
                active: 0,
                range: p(focuspunchId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), self = action.actor();
            focuspunchGatherStart(self, action.id(), world.tick());
            const body = world.observe(self);
            const scale = body === null ? 1 : body.height() / 1.4;
            action.present("focuspunch:brace", focuspunchScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", windup: prepare, steady: config && config.steady === true,
                    gather: Math.round(p(focuspunchId, "brace", action)), scale: scale }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            focuspunchGatherEnd(self);
            const direction = aim(action);
            const length = p(focuspunchId, "reach", action);
            const step = p(focuspunchId, "lunge", action);
            const radius = p(focuspunchId, "collisionRadius", action);
            const power = p(focuspunchId, "punch", action);
            const push = p(focuspunchId, "push", action);
            const count = Math.round(18 + power * 0.18);
            let travelled = 0;

            sound(action, "cobblemon:move.firepunch.actor");
            WorldFeedback.emit(world, focuspunchScene, 1, action.origin(),
                { moment: "release", scale: radius / 0.5, count: count }, 24);

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, focuspunchScene, 1, at, { moment: "whiff", scale: radius / 0.5 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), focuspunchWhiffText, [], 24);
                scope.sound("minecraft:entity.vex.charge", at, 14, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(focuspunchId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, focuspunchId, power,
                            { damage: damageSpec(focuspunchId, "punch"), contact: true, punch: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, focuspunchScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), count: count, scale: radius / 0.5,
                                power: Math.round(power * 10) / 10 }, 30);
                        scope.sound("cobblemon:impact.fighting", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), focuspunchHitText,
                            [Math.round(power)], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(focuspunchId, "minimumMove", current) || travelled >= length) {
                    whiff(current, here.plus(delta));
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
