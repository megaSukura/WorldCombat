/**
 * 力量宝石 / powergem 的出手方式。
 *
 * 核心念头：把光收进一枚宝石般的焦点，射出一条又细又长、会贯穿的宝石光线。光走直线、被方块挡住，
 *   所以躲到掩体后或走开是唯一的解法；站在一条线上的敌人会被依次贯穿，越远分到的光越少。
 *
 * 两幕：
 *   起（gather，提交前）：光在身前收成一枚宝石焦点、碎晶向它聚拢，只播预告。
 *   射（beam → hit / fade）：提交后先沿瞄准方向量出这条光实际能射到多远（被方块挡住就止在那里），
 *       再在一条与判定同宽的走廊里依次贯穿每个非友方，越远威力越淡；每个人身上崩出一簇碎晶。
 *
 * 与同族分开：洁净光芒以自身为中心向外铺一圈，奇异之光是一束带混乱的幽光；
 *   力量宝石是一条又细又长、能贯穿、被掩体挡住的光，把一切给射程与穿透。
 */
namespace PokemonSkills {
    define({
        id: powergemId,
        cooldownParameter: "recharge",
        name: "Power Gem",
        description: "The user attacks with a ray of light that sparkles as if it were made of gemstones.",
        uses: ["在长距离点名一个远处的目标", "把光贯穿一条线上的敌人", "逼对手躲到掩体后才敢露头"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 13,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "gemlight",
        defaults: { focus: false, ai: { maxChase: 16, lineUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(powergemId, "beamLength", pokemon) : 12, geometry: "line", style: "gemlight", color: 0xBFE8FF, label: "力量宝石" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[powergemId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(powergemId, "tempo", context)),
                recover: Math.round(p(powergemId, "aftercast", context)),
                cooldown: Math.round(p(powergemId, "recharge", context)),
                active: 0,
                range: p(powergemId, "beamLength", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powergem:gather", powergemScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const power = p(powergemId, "ray", action);
            const length = Math.max(3, action.range());
            const width = Math.max(0.2, p(powergemId, "beamWidth", action));
            const falloff = Math.max(0.25, Math.min(0.9, p(powergemId, "falloff", action)));
            const shards = Math.max(6, Math.round(p(powergemId, "shards", action)));
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(2.4, length / 12));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));

            // 光走直线、被方块挡住：先量出这条光实际能射到多远。
            let beam = length;
            const steps = Math.max(1, Math.ceil(length / 0.5));
            for (let index = 1; index <= steps; index++) {
                const probe = centre.plus(direction.scale(length * index / steps));
                if (world.clear(centre, probe)) continue;
                beam = Math.max(0.5, length * (index - 1) / steps);
                break;
            }
            const end = centre.plus(direction.scale(beam));

            sound(action, "minecraft:block.amethyst_block.chime");
            WorldFeedback.emit(world, powergemScene, 1, centre,
                { moment: "beam", path: [[centre.x(), centre.y() + 0.7, centre.z()], [end.x(), end.y() + 0.7, end.z()]],
                    direction: [direction.x(), direction.y(), direction.z()], shards: shards, width: width,
                    scale: scale, intensity: intensity }, 26);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(centre, direction, beam, width, { below: 1.6, above: 2.6 }), function (victim, facts) {
                if (String(victim.ref()) === String(actor.ref())) return;
                const point = facts.position();
                if (!world.clear(centre, point)) return;
                const distance = point.minus(centre).length();
                const ratio = length <= 0 ? 0 : Math.min(1, distance / length);
                const strength = 1 - (1 - falloff) * ratio;
                if (!hurt(action, victim, powergemId, power * strength, { damage: damageSpec(powergemId, "ray") })) return;
                hits++;
                WorldFeedback.emit(world, powergemScene, 1, point,
                    { moment: "hit", target: String(victim.ref()), shards: shards, width: width, scale: scale,
                        strength: strength, intensity: Math.max(0.5, Math.min(2.2, (power * strength) / 80)) }, 24);
                world.sound("minecraft:block.amethyst_block.break", point, 14, "{}");
            });
            if (hits > 1) WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), powergemPierceText, [hits], 30);
            if (hits === 0) WorldFeedback.emit(world, powergemScene, 1, end, { moment: "fade", scale: scale }, 20);
            world.sound("minecraft:block.amethyst_block.resonate", end, 14, "{}");
            done(action);
        }
    });
}
