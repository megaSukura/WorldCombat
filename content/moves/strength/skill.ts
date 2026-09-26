/**
 * 怪力 / strength 的出手方式。
 *
 * 核心念头：把全身力气压进一记正面直拳。它没有花招——直线、必中、无副作用，命中就把目标顶退；
 * 只有目标身体真的被这一拳顶到背后的实墙上时，这一拳的力道无处泄，才再补一记撞墙冲击。它是“全力一击”
 * 家族里最稳、循环最短的一记，随时能放。
 *
 * 两幕：
 *   起（windup，提交前）：沉腰、把力气聚到拳上，只播预告表现。
 *   击（punch → impact）：提交后朝指定方向或目标做一次直线 trace，限定原拳程、首接触结算；命中活体结算
 *       接触+拳伤害，并把目标沿出拳方向顶退；随后从目标身体中心沿出拳方向做一次原生方块射线，只有身体
 *       确实贴到墙面才结算撞墙冲击。推不动的 Boss 若与墙仍有缝隙，不算撞墙，只吃普通直拳。
 *
 * 与同族分开：爆裂拳走弧线、可被走出、打中必乱；怪力是直线、必中、纯粹。
 * 配置 plant（扎根式）由 resolve 改时序、由公式改威力/顶退/撞墙，提交后才触碰世界。
 */
namespace PokemonSkills {
    const strengthScene = "world_combat:move_strength";
    const strengthHitText = "world_combat.move.strength.text.hit";
    const strengthSlamText = "world_combat.move.strength.text.slam";
    const strengthMissText = "world_combat.move.strength.text.miss";

    /** 出拳方向的水平分量；俯仰很大时退回完整方向，保证贴墙射线贴合身体背面而不是脚下的地面。 */
    function strengthWallAxis(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() > 0.05 ? flat.unit() : direction;
    }

    /**
     * 目标此刻是不是真被这一拳按在墙上：从目标身体中心沿出拳方向做原生方块碰撞射线，只有身体贴到墙面
     * 才算；墙在身后更远处有缝隙时不算。射线只看方块，不会把被推的活体自己算成墙。
     */
    function strengthPinned(world: CombatWorld, body: CombatObservation, direction: CombatPoint): boolean {
        const axis = strengthWallAxis(direction);
        const probe = Math.max(0.2, body.width() * 0.5 + 0.15);
        const from = body.position();
        return !world.clear(from, from.plus(axis.scale(probe)));
    }

    /** 墙面接触点：同一条射线走到身体外侧，作为撞墙尘的落点，让尘土留在墙面而不是免推目标的空中。 */
    function strengthWallPoint(body: CombatObservation, direction: CombatPoint): CombatPoint {
        const axis = strengthWallAxis(direction);
        return body.position().plus(axis.scale(Math.max(0.2, body.width() * 0.5 + 0.15)));
    }

    define({
        id: "strength",
        cooldownParameter: "recharge",
        name: "Strength",
        description: "把全身力气压进一记正面直拳：朝指定方向或目标沿一条直线出拳，命中线内的敌人就把它顶退，没有额外副作用；敌人被顶到背后的实墙上时再补一记撞墙冲击。",
        uses: ["贴脸稳定输出的一记重拳", "把目标打向墙或障碍，多赚一次撞墙伤害", "没有副作用，随时可以用"],
        kind: "aim",
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
            const offset = action.targetPosition().minus(origin);
            const direction = offset.length() < 0.01 ? action.direction() : offset.unit();
            const to = origin.plus(direction.scale(reach));
            const scale = radius / 0.34;
            const intensity = Math.max(0.6, Math.min(2.4, power / 60));
            // 权威判定先行：首接触决定拳线真正的终点，画面与结算用同一个点；空放也照常走完原拳程。
            const hit = action.trace(origin, to, radius);
            const endpoint = hit.position();
            const wallCell = hit.blocked() ? hit.blockPosition() : null;
            const path = [[origin.x(), origin.y(), origin.z()], [endpoint.x(), endpoint.y(), endpoint.z()]];
            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, strengthScene, 1, origin,
                { moment: "punch", path: path, direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 20);
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
                    world.hitDisplace(victim, direction.scale(shove));
                    const pressed = world.observe(victim);
                    if (pressed !== null) {
                        WorldFeedback.text(world, pressed.position().plus(WorldCombat.point(0, 1.2, 0)), strengthHitText, [], 26);
                        // 撞墙附伤必须有真实身体贴墙证据：推不动的 Boss 若与墙有缝，只吃普通直拳；贴到墙面才算撞墙。
                        if (strengthPinned(world, pressed, direction)) {
                            const wallAt = strengthWallPoint(pressed, direction);
                            if (hurt(action, victim, "strength", slam, { damage: damageSpec("strength", "slam"), contact: false })) {
                                WorldFeedback.emit(world, strengthScene, 1, wallAt,
                                    { moment: "slam", target: String(victim.ref()), scale: scale,
                                        intensity: Math.max(0.6, Math.min(2.2, slam / 30)) }, 24);
                                WorldFeedback.text(world, wallAt.plus(WorldCombat.point(0, 1.4, 0)), strengthSlamText, [], 28);
                                sound(action, "minecraft:item.mace.smash_ground");
                            }
                        }
                    }
                }
            } else {
                const point = hit.blocked() ? (wallCell === null ? endpoint : wallCell) : to;
                WorldFeedback.emit(world, strengthScene, 1, point,
                    { moment: "miss", path: [[origin.x(), origin.y(), origin.z()], [point.x(), point.y(), point.z()]], scale: scale, face: hit.blockFace() }, 18);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), strengthMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
            }
            done(action);
        }
    });
}
