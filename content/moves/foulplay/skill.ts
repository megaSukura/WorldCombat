/**
 * 欺诈 / foulplay 的出手方式。
 *
 * 核心念头：施法者自己不出力——一条暗影手臂从脚下爬到对手的影子里，从它自己脚下竖起一簇棘，
 *   把它的力气按在它自己身上。所以伤害读的是**目标的物攻**：对手越壮，这一记越重，施法者弱也咬得动强敌。
 *
 * 两幕：
 *   起（coil，提交前）：施法者蹲身，脚边暗影聚成一片，只播预告。
 *   伸（reach → seize / drag / miss）：提交后暗影沿地面爬过去（爬行速度决定耗时，画面是一条连到目标的暗影线），
 *       抵达时从目标影子底下竖起 `tendrils` 根棘并结算一次 trick 伤害；纠缠式再把它拖近一段、留一段踉跄。
 *       目标中途离场或暗影落空则只留一条散去的暗影。
 *
 * 与同族分开：本组同族（祸不单行、唤醒巴掌、燃尽）都以对手／自己的某种状态为武器；欺诈读的是**目标此刻的物攻**，
 *   而且直接把这份力气还给它。它和扑击（读自己的防御）方向相反：一个借别人的，一个用自己的。
 */
namespace PokemonSkills {
    define({
        id: foulplayId,
        cooldownParameter: "recharge",
        name: "Foul Play",
        description: "The user turns the target's strength against it. The higher the target's Attack stat, the greater the damage this move inflicts.",
        uses: ["用它自己的力气打它", "越壮的目标咬得越重", "纠缠式把强敌拖进近身"],
        kind: "enemy",
        range: 5.2,
        maxRange: 9.6,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "dark",
        defaults: { cling: false, ai: { maxChase: 9, strongAt: 100 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(foulplayId, "reach", pokemon) : 5.2, geometry: "line", style: "dark", color: 0x6C5CE0, label: "欺诈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[foulplayId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(foulplayId, "coil", context)),
                recover: Math.round(p(foulplayId, "settle", context)),
                cooldown: Math.round(p(foulplayId, "recharge", context)),
                active: 0,
                range: p(foulplayId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("foulplay:coil", foulplayScene, 1, action.origin(), JSON.stringify({ moment: "coil" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            if (target === null) { done(action); return; }
            const targetRef = String(target.ref());
            const targetPoint = action.targetPosition();
            const distance = targetPoint.minus(origin).length();
            const crawl = p(foulplayId, "crawl", action);
            const delay = Math.max(2, Math.round(distance / Math.max(0.4, crawl)));
            const power = p(foulplayId, "trick", action);
            const grasp = p(foulplayId, "grasp", action);
            const tendrils = Math.max(4, Math.round(p(foulplayId, "tendrils", action)));
            const cling = config && config.cling === true;
            const pull = p(foulplayId, "pull", action);
            const stagger = Math.max(1, Math.round(p(foulplayId, "stagger", action)));
            const scale = Math.max(0.6, Math.min(1.8, grasp / 0.42));
            const intensity = Math.max(0.5, Math.min(2.2, power / 85));

            sound(action, "cobblemon:move.shadowball.actor");
            WorldFeedback.emit(world, foulplayScene, 1, origin,
                { moment: "reach", path: [String(action.actor().ref()), targetRef], delay: delay,
                    tendrils: tendrils, scale: scale, intensity: intensity }, delay + 16);

            function seize(current: CombatAction): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (victim === null || body === null) {
                    WorldFeedback.emit(scope, foulplayScene, 1, targetPoint, { moment: "miss" }, 30);
                    WorldFeedback.text(scope, targetPoint.plus(WorldCombat.point(0, 1.0, 0)), foulplayMissText, [], 24);
                    sound(current, "minecraft:entity.vex.hurt");
                    done(current);
                    return;
                }
                const point = body.position();
                const landed = hurt(current, victim, foulplayId, power, { damage: damageSpec(foulplayId, "trick"), knockback: false });
                WorldFeedback.emit(scope, foulplayScene, 1, point,
                    { moment: "seize", target: targetRef, tendrils: tendrils, scale: scale, intensity: intensity }, 44);
                if (!landed) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), foulplayMissText, [], 24);
                    sound(current, "minecraft:entity.vex.hurt");
                    done(current);
                    return;
                }
                sound(current, "cobblemon:impact.dark");
                if (cling && scope.valid(victim)) {
                    const self = scope.observe(current.actor());
                    const here = self === null ? origin : self.position();
                    const toward = WorldCombat.point(here.x() - point.x(), 0, here.z() - point.z());
                    if (toward.length() > 0.05) scope.displace(victim, toward.unit().scale(pull));
                    if (scope.valid(victim)) scope.marker(victim, "minecraft:slowness", stagger, 1);
                    const at = scope.observe(victim);
                    const spot = at === null ? point : at.position();
                    WorldFeedback.emit(scope, foulplayScene, 1, spot, { moment: "drag", target: targetRef, scale: scale }, 34);
                    WorldFeedback.text(scope, spot.plus(WorldCombat.point(0, 1.05, 0)), foulplayDragText, [pull], 26);
                    sound(current, "minecraft:entity.enderman.teleport");
                } else {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.05, 0)), foulplaySeizeText, [], 24);
                }
                done(current);
            }

            action.after(delay, seize);
        }
    });
}
