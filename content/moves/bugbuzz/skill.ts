/**
 * 虫鸣 / bugbuzz —— 注册与动作。
 *
 * 两幕：
 *   起（windup，提交前）：身上/口边鼓起一圈圈振动预告。
 *   鸣（wave，提交后）：以自身为顶点朝目标方向压出一道锥形声波，贴地扩散；锥内每个敌人各结算一次伤害，
 *       威力随距离从满额衰减到 `falloff`；每人各掷一次 10% 起的碾防（共享 `NativeEffects.boost(..., "spd", -1)`）。
 *
 * 声波没有飞行物、瞬时展开，也不检查视线——石头墙挡不住声音。与同族分开：唯一锥形、近强远弱、可绕墙、
 * 可同时判定多人，但单发碾防概率最低。配置 `deep`（沉鸣）由 resolve 改时序、由公式改张角／射程／衰减／威力。
 */
namespace PokemonSkills {
    const bugbuzzScene = "world_combat:move_bugbuzz";
    const bugbuzzSunderText = "world_combat.move.bugbuzz.text.sunder";

    define({
        id: "bugbuzz",
        name: "Bug Buzz",
        description: "振动身体压出一道锥形声波，贴地扩散、可以穿过墙面：锥内每个敌人各承受一次特殊伤害，越近越重，并可能被震得特防下降 1 级。",
        uses: ["中近距离一次扫到锥形范围里的敌人", "隔着墙也能震到对手", "用近身满额的声波压制扎堆的敌人"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 13,
        active: 0,
        recover: 10,
        cooldown: 28,
        style: "resonance",
        defaults: { deep: false, ai: { maxChase: 11, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bugbuzz", "coneLength", pokemon), geometry: "cone", style: "resonance", color: 0xA8C63A, label: "虫鸣" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bugbuzz"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("bugbuzz", "tempo", context)),
                recover: 10,
                cooldown: 28 + (deep ? 3 : 0),
                active: 0,
                range: p("bugbuzz", "coneLength", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:bugbuzz:" + action.id(), bugbuzzScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const power = p("bugbuzz", "core", action);
            const angle = p("bugbuzz", "coneAngle", action);
            const length = p("bugbuzz", "coneLength", action);
            const falloff = p("bugbuzz", "falloff", action);
            const chance = p("bugbuzz", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("bugbuzz", "sunderStage", action)));
            const rings = Math.max(3, Math.round(p("bugbuzz", "rings", action)));
            const direction = aim(action);
            const scale = Math.max(0.5, Math.min(2.6, length / 9));

            sound(action, "minecraft:entity.warden.sonic_charge");

            const region = WorldGeometry.sector(centre, direction, length, angle, { below: 2, above: 3 });
            let hits = 0;
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (String(enemy.ref()) === String(actor.ref())) return;
                const distance = facts.position().minus(centre).length();
                const reach = length <= 0 ? 0 : Math.min(1, distance / length);
                const strength = 1 - (1 - falloff) * reach;
                const dealt = hurt(action, enemy, "bugbuzz", power * strength, { damage: damageSpec("bugbuzz", "core"), sound: true });
                if (!dealt) return;
                hits++;
                const intensity = Math.max(0.5, Math.min(2.2, (power * strength) / 80));
                WorldFeedback.emit(world, bugbuzzScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), rings: rings, strength: strength, intensity: intensity, scale: scale }, 24);
                if (world.valid(enemy) && world.random() < chance) {
                    NativeEffects.boost(world, enemy, "spd", -stages);
                    const at = world.observe(enemy);
                    if (at !== null)
                        WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.2, 0)), bugbuzzSunderText, [stages], 30);
                }
            });

            WorldFeedback.emit(world, bugbuzzScene, 1, centre,
                { moment: "wave", direction: [direction.x(), direction.y(), direction.z()], angle: angle, length: length,
                    rings: rings, hits: hits, intensity: Math.max(0.6, Math.min(2.2, power / 84)) }, 26);
            sound(action, "minecraft:entity.warden.sonic_boom");
            done(action);
        }
    });
}
