/**
 * 报复 / revenge 的出手方式。
 *
 * 核心念头：站定、握紧拳头，把这口刚被这个对手打出来的气原样递回去；是它本人下的手，这一拳就翻倍。
 *
 * 两幕：
 *   起（windup，提交前）：屈膝站定，一圈斗气从脚下收拢到拳上，被目标打过时拳面泛红（present brace）。
 *   递（execute）：朝目标踏出一步、trace 撞上活体即结算 `retort` 接触伤害，把贴脸的对手一拳送开；
 *       目标本人刚打过施法者时翻倍，画面换成更重的拳风并浮出「报复！」；没递到就收拳。
 *
 * 与同族分开：报复读的是「这个对手刚打过我」，是短而重的正面一拳、击退最远；
 *   恶意追击读目标的伤（贴身追）、雪崩读自己累计的挨打（慢而广的冰崩）、清醒读目标的麻痹。
 */
namespace PokemonSkills {
    define({
        id: revengeId,
        name: "Revenge",
        description: "站定还手：若最近被当前目标本人打过，这一拳威力翻倍，并把贴脸的对手一拳送开。短而直、击退强。",
        uses: ["被对手贴上打过之后立刻还一拳", "把冲上来的对手从身上打退", "惩罚先手近身攻击自己的敌人"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.2,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "fighting",
        defaults: { endure: false, ai: { maxChase: 8, avenge: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(revengeId, "radius", pokemon) * 1.6 : 0.6, geometry: "line", style: "fighting", color: 0xE2662E,
                label: config && config.endure === true ? "报复·硬扛" : "报复" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[revengeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(revengeId, "tempo", context)),
                recover: Math.round(p(revengeId, "settle", context)),
                cooldown: Math.round(p(revengeId, "recharge", context)),
                active: 0,
                range: p(revengeId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const grudge = revengeGrudge(factContext(action)) > 0;
            const smash = Math.round(p(revengeId, "smash", action));
            const self = world.observe(actor);
            let bruise = 0;
            if (self !== null) bruise = Math.max(0, Math.min(1, 1 - self.health() / Math.max(1, self.maxHealth())));
            action.present("revenge:brace", revengeScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", grudge: grudge ? 1 : 0, endure: config && config.endure === true,
                    smash: smash, bruise: Math.round(bruise * 100) / 100, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(revengeId, "reach", action);
            const step = p(revengeId, "step", action);
            const radius = p(revengeId, "radius", action);
            const push = p(revengeId, "push", action);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.34));
            let travelled = 0;

            sound(action, "minecraft:entity.iron_golem.attack");
            WorldFeedback.emit(action.world(), revengeScene, 1, action.origin(),
                { moment: "drive", direction: [direction.x(), direction.y(), direction.z()],
                    smash: Math.round(p(revengeId, "smash", action)), scale: scale }, 26);

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(1.2)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(revengeId, "retort", current);
                        const grudge = revengeGrudge(factContext(current)) > 0;
                        const smash = Math.round(p(revengeId, "smash", current));
                        const landed = impact(current, hit, revengeId, power, { damage: damageSpec(revengeId, "retort"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05 && scope.valid(victim)) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, revengeScene, 1, hit.position(),
                            { moment: grudge ? "retort" : "impact", target: String(victim.ref()), grudge: grudge ? 1 : 0,
                                power: Math.round(power * 10) / 10, smash: grudge ? smash : Math.round(smash * 0.6), scale: scale,
                                intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 28);
                        scope.sound(grudge ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.strong", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            grudge ? revengeRetortText : revengeHitText, [], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, revengeScene, 1, here.plus(delta), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, here.plus(delta).plus(WorldCombat.point(0, 1.0, 0)), revengeMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    done(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
