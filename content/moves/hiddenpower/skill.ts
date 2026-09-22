/**
 * 觉醒力量的动作：准备期把个体属性收拢成一颗光球，随后射出，命中处爆开同色光斑。
 *
 * 幕：凝聚（windup，提交前用 present 预示）→ 射出（execute，可跟踪的投射物）→ 命中（世界里的爆发）。
 * 所有光斑数量、光球大小与颜色都来自 parameters.ts 算出的机制值。
 */
namespace PokemonSkills {
    define({
        id: hiddenpowerId,
        name: "Hidden Power",
        description: "Draw out the type hidden in the user's own body and fire it as a beam.",
        uses: ["ranged strike"],
        kind: "enemy",
        range: 14,
        maxRange: 22,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 45,
        style: "bolt",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[hiddenpowerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p(hiddenpowerId, "charge", context)), recover: 8, cooldown: 45, active: 0,
                range: p(hiddenpowerId, "reach", context) };
        },
        windup: function (action, config, prepare) {
            const pokemon = CobblemonCombat.pokemon(action.actor());
            const type = hiddenpowerTypeOf(pokemon);
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            const power = p(hiddenpowerId, "power", action);
            const focus = p(hiddenpowerId, "focus", action);
            action.present(hiddenpowerId + ":scene", hiddenpowerScene, 1, action.origin(), JSON.stringify({
                moment: "charge", type: type, scale: scale,
                coreRate: 5 + Math.round(focus * 1.5), ringCount: Math.max(1, Math.round(focus)),
                moteRate: 6 + Math.round(power * 0.12), moteCap: 40 + Math.round(power)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const pokemon = CobblemonCombat.pokemon(action.actor());
            const type = hiddenpowerTypeOf(pokemon);
            const color = hiddenpowerColors[type] || 0x9B59FF;
            const power = p(hiddenpowerId, "power", action);
            const speed = p(hiddenpowerId, "velocity", action);
            const radius = p(hiddenpowerId, "radius", action);
            const body = action.world().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            const impactCount = 16 + Math.round(power * 0.5);
            const glintCount = 12 + Math.round(power * 0.35);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            const projectile = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:particle/generic/orb/energyorb", scale: 0.7, tint: color, glow: true },
                impact: function (current, hit, age) {
                    const target = hit.target();
                    if (target && !current.sense().friendly(target)) impact(current, hit, hiddenpowerId, power);
                    const point = hit.position(), world = current.world();
                    WorldFeedback.emit(world, hiddenpowerScene, 1, point, { moment: "impact", type: type, power: power,
                        impactCount: impactCount, glintCount: glintCount, ringRadius: 0.7 + power * 0.005 }, 30);
                    world.sound("minecraft:entity.generic.explode", point, 12, "{}");
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)),
                        "world_combat.move.hiddenpower.text.type", [{ key: "cobblemon.type." + type, fallback: type }], 30);
                }
            }, done);
            action.present(hiddenpowerId + ":scene", hiddenpowerScene, 1, action.origin(), JSON.stringify({
                moment: "flight", projectile: projectile, type: type, scale: scale,
                trailRate: 10 + Math.round(power * 0.18)
            }));
        },
        indicator: function () {
            return { radius: 0.6, geometry: "area", style: "bolt", label: "Hidden Power" };
        }
    });
}
