/** punishment：行为、参数与目标条件以本单元实现为准。 */
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
        freeMovement: true,
        id: punishmentId,
        cooldownParameter: "recharge",
        name: "Punishment",
        description: "用近身重击惩罚强化中的对手；正面能力等级、药水和信标增益越多，打得越重。",
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
