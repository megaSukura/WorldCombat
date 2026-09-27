/**
 * 觉醒力量的动作：准备期把个体属性收拢成一颗光球，随后射出，命中处爆开同色光斑。
 *
 * 幕：凝聚（windup，提交前用 present 预示实际觉醒属性符号）→ 射出（execute，可跟踪的投射物）→
 *     命中（实体 burst／被拒绝 fizzle；方块 shatter；到程落空 expire）。
 * 选取为 aim：自由瞄方向/点，可空放；实体伤害权限由命中层判定，撞到方块即碎裂结束，不贯穿、不留场地。
 * 反馈都落在真实接触点：命中成功才报爆环与属性浮字，被拒绝只溃散；墙面碎片沿方块外法线崩开；
 * 到程落空用 world.projectilePosition 取弹体真实末端轻散。指示器显示这只精灵固定的觉醒属性与属性色。
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
            // 尾迹密度由 trail 的 minDistance 驱动（trailRate 对 trail 发射器不生效）：威力越高间隔越小、尾越密。
            const trail = Math.max(0.06, Math.min(0.30, 0.28 - power * 0.0015));
            let struck = false;
            sound(action, "minecraft:entity.illusioner.cast_spell");
            let projectile = "";
            projectile = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: aim(action),
                appearance: { sprite: "cobblemon:particle/generic/orb/energyorb", scale: 0.7, tint: color, glow: true },
                impact: function (current, hit, age) {
                    struck = true;
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    // 实体首碰：按属性爆开并结算一次伤害；只有伤害真实成立才播成功爆环与属性浮字。
                    if (victim !== null) {
                        const landed = !scope.friendly(victim) && impact(current, hit, hiddenpowerId, power);
                        if (landed) {
                            WorldFeedback.emit(scope, hiddenpowerScene, 1, point, { moment: "burst", type: type,
                                impactCount: impactCount, glintCount: glintCount, ringRadius: 0.7 + power * 0.005 }, 30);
                            scope.sound("minecraft:entity.generic.explode", point, 12, "{}");
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)),
                                "world_combat.move.hiddenpower.text.type", [{ key: "cobblemon.type." + type, fallback: type }], 30);
                        } else {
                            // 被拒绝（相性免疫／友方／权限）：光球只溃散，不报成功。
                            WorldFeedback.emit(scope, hiddenpowerScene, 1, point, { moment: "fizzle", type: type,
                                impactCount: Math.max(6, Math.round(impactCount * 0.4)), glintCount: Math.max(4, Math.round(glintCount * 0.4)) }, 22);
                            scope.sound("minecraft:entity.illusioner.mirror_move", point, 8, "{}");
                        }
                        return;
                    }
                    // 方块首碰：碎片沿方块外法线朝墙外崩开；无具体方块面时反弹回施法者一侧。反馈落在真实接触点。
                    const normal = hiddenpowerFaceNormal(hit.blockFace());
                    const away = normal ? normal : hiddenpowerBack(current, point);
                    WorldFeedback.emit(scope, hiddenpowerScene, 1, point, { moment: "shatter", type: type,
                        count: impactCount, direction: [away.x(), away.y(), away.z()] }, 26);
                    scope.sound("minecraft:block.glass.break", point, 10, "{}");
                }
            }, function (current) {
                // 到程落空：光球在弹体真正走到的末端轻轻散开，而不是停在瞄准点或满射程点。
                if (!struck) {
                    const end = current.world().projectilePosition(projectile);
                    if (end !== null)
                        WorldFeedback.emit(current.world(), hiddenpowerScene, 1, end, { moment: "expire", type: type,
                            impactCount: Math.max(6, Math.round(impactCount * 0.35)), glintCount: Math.max(4, Math.round(glintCount * 0.3)) }, 20);
                }
                done(current);
            });
            action.present(hiddenpowerId + ":scene", hiddenpowerScene, 1, action.origin(), JSON.stringify({
                moment: "flight", projectile: projectile, type: type, scale: scale, trail: trail
            }));
        },
        indicator: function (_config, pokemon) {
            const type = pokemon ? hiddenpowerTypeOf(pokemon) : "";
            return { radius: 0.6, geometry: "area", style: "bolt",
                color: pokemon ? hiddenpowerColorOf(pokemon) : undefined,
                label: type ? "Hidden Power · " + type : "Hidden Power" };
        }
    });
}
