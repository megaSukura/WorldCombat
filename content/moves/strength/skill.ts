/**
 * 怪力 / strength 的出手方式。
 *
 * 核心念头：把全身力气压进一记正面直拳。它没有花招——直线、必中、无副作用，命中就把目标顶退；
 * 若目标退无可退（背后是墙、方块或地形），这一拳的力道无处泄，再补一记撞墙冲击。它是“全力一击”
 * 家族里最稳、循环最短的一记，随时能放。
 *
 * 两幕：
 *   起（windup，提交前）：沉腰、把力气聚到拳上，只播预告表现。
 *   击（punch → impact）：提交后沿瞄准方向做一次直线 trace；命中活体结算接触+拳伤害，并把目标沿出拳
 *       方向顶退；实际位移明显小于预想（被障碍挡住）时，再结算一记撞墙冲击。落空只扬尘。
 *
 * 与同族分开：爆裂拳走弧线、可被走出、打中必乱；怪力是直线、必中、纯粹。
 * 配置 plant（扎根式）由 resolve 改时序、由公式改威力/顶退/撞墙，提交后才触碰世界。
 */
namespace PokemonSkills {
    const strengthScene = "world_combat:move_strength";
    const strengthHitText = "world_combat.move.strength.text.hit";
    const strengthSlamText = "world_combat.move.strength.text.slam";
    const strengthMissText = "world_combat.move.strength.text.miss";

    define({
        id: "strength",
        cooldownParameter: "recharge",
        name: "Strength",
        description: "把全身力气压进一记正面直拳：沿一条直线出拳，命中线内的敌人就把它顶退，没有额外副作用；敌人退无可退时再补一记撞墙冲击。",
        uses: ["贴脸稳定输出的一记重拳", "把目标打向墙或障碍，多赚一次撞墙伤害", "没有副作用，随时可以用"],
        kind: "enemy",
        range: 2.2,
        maxRange: 3.2,
        prepare: 7,
        active: 14,
        recover: 8,
        cooldown: 36,
        style: "punch",
        defaults: { plant: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("strength", "punchRadius", pokemon) * 1.8, geometry: "line", style: "punch", color: 0xC9A06A, label: "怪力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["strength"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("strength", "tempo", context)),
                recover: Math.round(p("strength", "aftercast", context)),
                cooldown: Math.round(p("strength", "recharge", context)),
                range: p("strength", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_strength:windup", strengthScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", plant: !!(config && config.plant) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const reach = p("strength", "reach", action);
            const radius = p("strength", "punchRadius", action);
            const power = p("strength", "slug", action);
            const slam = p("strength", "slam", action);
            const shove = p("strength", "shove", action);
            const direction = aim(action);
            const to = origin.plus(direction.scale(reach));
            const scale = radius / 0.34;
            const intensity = Math.max(0.6, Math.min(2.4, power / 60));
            const path = [[origin.x(), origin.y(), origin.z()], [to.x(), to.y(), to.z()]];
            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, strengthScene, 1, origin,
                { moment: "punch", path: path, direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 20);
            const hit = action.trace(origin, to, radius);
            if (hit.hitEntity()) {
                const victim = hit.target();
                const point = hit.position();
                const landed = victim !== null && impact(action, hit, "strength", power,
                    { damage: damageSpec("strength", "slug"), contact: true, punch: true });
                WorldFeedback.emit(world, strengthScene, 1, point,
                    { moment: "impact", target: victim ? String(victim.ref()) : "", path: path, scale: scale,
                        intensity: intensity, hits: Math.round(14 + power * 0.2) }, 26);
                sound(action, "cobblemon:move.closecombat.target");
                if (landed && victim !== null && world.valid(victim)) {
                    const moved = world.displace(victim, direction.scale(shove));
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), strengthHitText, [], 26);
                    if (moved < shove * 0.5) {
                        const body = world.observe(victim);
                        const at = body === null ? point : body.position();
                        if (hurt(action, victim, "strength", slam, { damage: damageSpec("strength", "slam"), contact: false })) {
                            WorldFeedback.emit(world, strengthScene, 1, at,
                                { moment: "slam", target: String(victim.ref()), scale: scale,
                                    intensity: Math.max(0.6, Math.min(2.2, slam / 30)) }, 24);
                            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.4, 0)), strengthSlamText, [], 28);
                            sound(action, "minecraft:item.mace.smash_ground");
                        }
                    }
                }
            } else {
                const point = hit.blocked() ? hit.position() : to;
                WorldFeedback.emit(world, strengthScene, 1, point,
                    { moment: "miss", path: [[origin.x(), origin.y(), origin.z()], [point.x(), point.y(), point.z()]], scale: scale }, 18);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), strengthMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
            }
            done(action);
        }
    });
}
