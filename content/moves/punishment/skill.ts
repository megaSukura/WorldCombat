/**
 * 惩罚 / punishment 的出手方式。
 *
 * 核心念头：**把对手涨起来的每一层力量在手里称一称，然后一记压顶砸下去**——对手攒得越满，这一记越沉。
 *   本族唯一从对手身上取力的招：别招把目标的能力变化抹掉，它把那些变化算进威力。
 *
 * 两幕：
 *   起（weigh，提交前）：施法者抬手、朝目标方向浮起一串重量标记，目标每有 1 级正向能力就多一枚；只播预告。
 *   判（fall → hit / miss，提交后）：朝目标踏进半步凑到射程，一记 `judge` 接触伤害从高处砸下；
 *       实际威力由出手时 `punishment.boost`（目标七项正向等级之和）决定；落空只留一道空砸。
 *
 * 与同族分开：逐步击破、ＤＤ金勾臂、圣剑无视目标的能力变化；惩罚反过来读它，攒得越多打得越重。
 *
 * 配置 `heavy` 由公式改读能力的系数与射程、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const punishmentScene = "world_combat:move_punishment";
    const punishmentHitText = "world_combat.move.punishment.text.hit";
    const punishmentMissText = "world_combat.move.punishment.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function punishmentHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: punishmentId,
        cooldownParameter: "recharge",
        name: "Punishment",
        description: "The more the target has powered up with stat changes, the greater this move's power.",
        uses: ["对手叠了能力等级时打它一记重的", "把目标涨起来的每一层力量称进威力里", "一记从高处落下的压顶处刑"],
        kind: "enemy",
        range: 2.0,
        maxRange: 3.2,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "judge",
        defaults: { heavy: false, ai: { maxChase: 6, punishBoost: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(punishmentId, "reach", pokemon), geometry: "line", style: "judge", color: 0x6E5AA8,
                label: config && config.heavy === true ? "惩罚·重判" : "惩罚" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[punishmentId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(punishmentId, "tempo", context)),
                recover: Math.round(p(punishmentId, "aftercast", context)),
                cooldown: Math.round(p(punishmentId, "recharge", context)),
                active: 0,
                range: p(punishmentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const boost = target !== null && world.valid(target) ? punishmentBoosts(world, target) : 0;
            action.present("world_combat:move_punishment:weigh", punishmentScene, 1, action.origin(),
                JSON.stringify({ moment: "weigh", windup: prepare, boost: boost, heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const heading = punishmentHeading(aim(action));
            const reach = Math.max(1.6, p(punishmentId, "reach", action));
            const power = p(punishmentId, "judge", action);
            const weights = Math.max(6, Math.round(p(punishmentId, "weights", action)));
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const scale = Math.max(0.6, Math.min(1.9, reach / 2.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 56));
            const heavy = config && config.heavy === true ? 1 : 0;

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, punishmentScene, 1, origin.plus(heading.scale(reach * 0.8)),
                    { moment: "miss", boost: 0, weights: Math.round(weights * 0.5), scale: scale, heavy: heavy }, 16);
                WorldFeedback.text(world, origin.plus(heading.scale(reach * 0.8)).plus(WorldCombat.point(0, 1.0, 0)), punishmentMissText, [], 20);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const boost = punishmentBoosts(world, target);

            const toTarget = foe.position().minus(origin);
            const distance = toTarget.length();
            if (distance > reach * 0.85) {
                const step = Math.min(distance - reach * 0.6, reach);
                if (step > 0.05) world.displace(actor, toTarget.unit().scale(step));
            }
            const arrived = world.observe(actor);
            const at = arrived === null ? origin : arrived.position();
            const strike = foe.position();

            sound(action, "minecraft:block.anvil.land");
            WorldFeedback.emit(world, punishmentScene, 1, at,
                { moment: "fall", path: [[at.x(), at.y() + 2.4, at.z()], [strike.x(), strike.y() + 0.4, strike.z()]],
                  direction: [heading.x(), heading.y(), heading.z()], boost: boost, weights: weights,
                  scale: scale, intensity: intensity, heavy: heavy }, 18);

            const landed = hurt(action, target, punishmentId, power,
                { damage: damageSpec(punishmentId, "judge"), contact: true });
            WorldFeedback.emit(world, punishmentScene, 1, strike,
                { moment: landed ? "hit" : "miss", target: String(target.ref()), boost: boost, weights: weights,
                  scale: scale, intensity: intensity }, 20);
            WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.2, 0)),
                landed ? punishmentHitText : punishmentMissText, landed ? [boost] : [], 22);
            if (landed) sound(action, "cobblemon:impact.dark");
            done(action);
        }
    });
}
