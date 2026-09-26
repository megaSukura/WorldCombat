/**
 * 报仇 / retaliate 的出手方式。
 *
 * 核心念头：同伴在眼前倒下——把那一幕压进这一撞里，朝敌人直直撞过去；带着哀兵之痛时，这一记是替同伴打出的，
 *   翻倍。它奖励的是「同伴阵亡后立刻还手」，所以窗口很短、只等一个出手。
 *
 * 两幕：
 *   起（mourn，提交前）：低头一瞬、身上压出灰白的哀气，带上哀兵时更浓。
 *   撞（charge → strike／miss）：提交后逐刻朝目标冲，trace 撞上活体即结算 `vengeance` 接触伤害并把人顶开；
 *       带着哀兵命中后这口气就泄了（状态被消掉）。没撞上就把这股劲留到下一次。
 *
 * 与同族分开：
 *   以牙还牙吃的是「自己被打过」、暗色回击；报仇吃的是「同伴倒下了」、一般属性的直撞；
 *   泄愤吃的是「自己被削弱」。三者都翻倍，但读的现场事实完全不同。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: retaliateId,
        cooldownParameter: "recharge",
        name: "Retaliate",
        description: "为倒下的同伴报仇：朝敌人直直撞过去；同伴刚倒下时，这一记翻倍、越亲近的同伴倒下打得越重，命中后这口气才泄。",
        uses: ["同伴倒下后立刻替它还手", "带着哀兵之痛打出一记翻倍直撞", "朝刚打完同伴的敌人撞过去"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.2,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "contact",
        defaults: { solemn: false, ai: { maxChase: 9, avenge: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(retaliateId, "collisionRadius", pokemon) * 1.5 : 0.7, geometry: "line", style: "contact",
                color: 0xD9D2C4, label: config && config.solemn === true ? "报仇·哀兵" : "报仇" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[retaliateId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(retaliateId, "tempo", context)),
                recover: Math.round(p(retaliateId, "settle", context)),
                cooldown: Math.round(p(retaliateId, "recharge", context)),
                active: 0,
                range: p(retaliateId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const avenging = world.valid(actor) && CombatStatus.has(world, actor, retaliateStatus);
            const here = action.origin();
            const origin = avenging ? retaliateOrigin(String(actor.ref())) : null;
            const from = origin === null ? null : WorldCombat.point(origin[0], origin[1], origin[2]);
            // 起手时把「真正倒下的那名同伴的位置」交给表现画一束短余光；不凭粒子另造一个亡灵攻击者。
            const link = from === null ? 0 : Math.max(6, Math.min(28, Math.round(from.minus(here).length() * 1.6)));
            const data: any = { moment: "mourn", windup: prepare, wisp: avenging ? 12 : 0, link: link };
            if (from !== null) data.path = [[from.x(), from.y(), from.z()], "source"];
            action.present("world_combat:retaliate:mourn", retaliateScene, 1, here, JSON.stringify(data));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(retaliateScene);
            const world = action.world(), actor = action.actor();
            const start = world.observe(actor);
            if (start === null) { movementScenes.finish(action, done); return; }
            const direction = aim(action);
            const length = p(retaliateId, "dash", action);
            const step = p(retaliateId, "charge", action);
            const radius = p(retaliateId, "collisionRadius", action);
            const push = p(retaliateId, "push", action);
            const streaks = Math.max(6, Math.round(p(retaliateId, "streaks", action)));
            const avenging = CombatStatus.has(world, actor, retaliateStatus);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.45));
            let travelled = 0;

            sound(action, "minecraft:entity.iron_golem.attack");
            movementScenes.show(action, "charge", start.position(), { moment: "charge", direction: [direction.x(), direction.y(), direction.z()], streaks: streaks, scale: scale });

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(retaliateId, "vengeance", current);
                        const landed = impact(current, hit, retaliateId, power, { damage: damageSpec(retaliateId, "vengeance"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05 && scope.valid(victim)) scope.hitDisplace(victim, away.unit().scale(push));
                            if (avenging) CombatStatus.cure(scope, current.actor(), retaliateStatus);
                            WorldFeedback.emit(scope, retaliateScene, 1, hit.position(),
                                { moment: "strike", target: String(victim.ref()), streaks: streaks, scale: scale,
                                    intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 26);
                            if (avenging)
                                WorldFeedback.emit(scope, retaliateScene, 1, hit.position(),
                                    { moment: "release", streaks: streaks, scale: scale,
                                        intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 24);
                            sound(current, avenging ? "minecraft:entity.player.attack.strong" : "cobblemon:impact.normal");
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.15, 0)),
                                avenging ? retaliateRageText : retaliateHitText, [], 26);
                        }
                        movementScenes.finish(current, done);
                        return;
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, retaliateScene, 1, current.origin(),
                        { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), retaliateMissText, [], 26);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    movementScenes.finish(current, done);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
