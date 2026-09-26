/**
 * 觉醒力量的动作：准备期把个体属性收拢成一颗光球，随后射出，命中处爆开同色光斑。
 *
 * 幕：凝聚（windup，提交前用 present 预示实际觉醒属性符号）→ 射出（execute，可跟踪的投射物）→
 *     命中（实体 burst／方块 shatter）。
 * 选取为 aim：自由瞄方向/点，可空放；实体伤害权限由命中层判定，撞到方块即碎裂结束，不贯穿、不留场地。
 * 所有光斑数量、光球大小与颜色都来自 parameters.ts 算出的机制值。
 */
namespace PokemonSkills {
    define({
        id: hiddenpowerId,
        name: "Hidden Power",
        description: "把体内隐藏的属性收拢成一颗光球射向目标；属性由使用者的个体值决定。",
        uses: ["远程点射"],
        kind: "aim",
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
                coreRate: 5 + Math.round(focus * 1.5), ringCount: Math.max(1, Math.round(focus))
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
                speed: speed, range: action.range(), radius: radius, direction: aim(action),
                appearance: { sprite: "cobblemon:particle/generic/orb/energyorb", scale: 0.7, tint: color, glow: true },
                impact: function (current, hit, age) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    // 实体首碰：按属性爆开并结算一次伤害；友方只呈现、不结算。
                    if (victim !== null) {
                        if (!scope.friendly(victim)) impact(current, hit, hiddenpowerId, power);
                        WorldFeedback.emit(scope, hiddenpowerScene, 1, point, { moment: "burst", type: type,
                            impactCount: impactCount, glintCount: glintCount, ringRadius: 0.7 + power * 0.005 }, 30);
                        scope.sound("minecraft:entity.generic.explode", point, 12, "{}");
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)),
                            "world_combat.move.hiddenpower.text.type", [{ key: "cobblemon.type." + type, fallback: type }], 30);
                        return;
                    }
                    // 方块首碰：球弹在原生方块面碎开并结束，不贯穿、不留场地。
                    const normal = hiddenpowerFaceNormal(hit.blockFace());
                    const back = normal ? normal.scale(-1) : hiddenpowerBack(current, point);
                    const at = hit.blockPosition() || point;
                    WorldFeedback.emit(scope, hiddenpowerScene, 1, at, { moment: "shatter", type: type,
                        count: impactCount, direction: [back.x(), back.y(), back.z()] }, 26);
                    scope.sound("minecraft:block.glass.break", at, 10, "{}");
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
