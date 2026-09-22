/**
 * 逐步击破 / chipaway 的出手方式。
 *
 * 核心念头：**贴脸一段有节奏的三拍连击，每一拍落在不同的高度**——对手的防御架势只能扎在某条线上，
 *   另外两条线照样进得去，所以它涨起来的防御等级挡不住这几拍。本族最稳、最省、最贴脸的一招。
 *
 * 两幕：
 *   起（read，提交前）：压步、把攻势提起来，拳前亮起三点微光；只播预告，可被打断（打断不花 PP）。
 *   击（beat → hit / miss，提交后）：提交后沿身前 `reach` 格长、`half` 半宽的击打线连出 `beats` 拍，
 *       每拍落在不同高度、各结算一次 `strike` 接触伤害；全落空只留一道空挥。
 *
 * 「无视能力变化」：本文件末尾的 `PokemonDamage.metadata` 贡献点在本招每拍结算前，把目标本段对应的防御
 *   能力等级归零；攻击方自身等级、相性、暴击、护甲与特性道具仍照常结算。对宝可梦与对原版生物同一条路径。
 *
 * 与同族分开：ＤＤ金勾臂扫一整圈、圣剑一记最长的切斩、惩罚越读越重；逐步击破凭「贴脸、分高度、接连几拍」。
 *
 * 配置 `rush` 由公式改每拍威力、拍数与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const chipawayScene = "world_combat:move_chipaway";
    const chipawayHitText = "world_combat.move.chipaway.text.hit";
    const chipawayMissText = "world_combat.move.chipaway.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function chipawayHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 第 n 拍的击打线：origin 起、沿 heading 铺 `reach` 格、半宽 `half`，抬到 `lift` 高度；判定与画面共用。 */
    function chipawayLane(origin: CombatPoint, heading: CombatPoint, reach: number, half: number, lift: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(WorldCombat.point(0, lift - 0.7, 0));
        const far = near.plus(heading.scale(reach));
        const a = near.plus(side.scale(half)), b = near.minus(side.scale(half));
        const c = far.minus(side.scale(half)), d = far.plus(side.scale(half));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()], [c.x(), c.y(), c.z()], [d.x(), d.y(), d.z()]];
    }

    define({
        id: chipawayId,
        name: "Chip Away",
        description: "Looking for an opening, the user strikes consistently. This also ignores the target's stat changes.",
        uses: ["贴脸连续几拍，每拍落在不同高度", "把目标涨起来的防御等级直接无视掉", "用快而省的连击稳定削血"],
        kind: "enemy",
        range: 1.9,
        maxRange: 2.8,
        prepare: 4,
        active: 12,
        recover: 5,
        cooldown: 12,
        style: "chip",
        defaults: { rush: false, ai: { maxChase: 5, breakGuard: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(chipawayId, "reach", pokemon), geometry: "line", style: "chip", color: 0xE8E4D8,
                label: config && config.rush === true ? "逐步击破·抢攻" : "逐步击破" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[chipawayId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(chipawayId, "tempo", context)),
                recover: Math.round(p(chipawayId, "aftercast", context)),
                cooldown: Math.round(p(chipawayId, "recharge", context)),
                active: skills[chipawayId].active,
                range: p(chipawayId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_chipaway:read", chipawayScene, 1, action.origin(),
                JSON.stringify({ moment: "read", windup: prepare, rush: config && config.rush === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const heading = chipawayHeading(aim(action));
            const reach = Math.max(1.3, p(chipawayId, "reach", action));
            const half = Math.max(0.24, p(chipawayId, "half", action));
            const beats = Math.max(2, Math.min(4, Math.round(p(chipawayId, "beats", action))));
            const power = p(chipawayId, "strike", action);
            const chips = Math.max(6, Math.round(p(chipawayId, "chips", action)));
            const scale = Math.max(0.6, Math.min(1.8, reach / 1.7));
            const intensity = Math.max(0.6, Math.min(2.2, power / 20));
            let beat = 0, landed = 0, over = false;

            function strike(current: CombatAction): void {
                const world = current.world();
                const body = world.observe(actor);
                const origin = body === null ? current.origin() : body.position();
                const lift = [0.25, 0.85, 0.45, 1.0][beat % 4];
                const path = chipawayLane(origin, heading, reach, half, lift);
                const direction = [heading.x(), heading.y(), heading.z()];

                if (beat === 0) sound(current, "minecraft:entity.player.attack.weak");
                WorldFeedback.emit(world, chipawayScene, 1, origin,
                    { moment: "beat", beat: beat + 1, path: path, direction: direction, reach: reach,
                      chips: chips, scale: scale, intensity: intensity }, 14);

                const found: CombatActor[] = [];
                WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, reach, half, { below: 0.6, above: 1.8 }),
                    function (candidate) { if (found.length === 0) found.push(candidate); });
                if (found.length > 0) {
                    const victim = found[0];
                    if (hurt(current, victim, chipawayId, power, { damage: damageSpec(chipawayId, "strike"), contact: true })) {
                        landed++;
                        const foe = world.observe(victim);
                        if (foe !== null) {
                            WorldFeedback.emit(world, chipawayScene, 1, foe.position(),
                                { moment: "hit", target: String(victim.ref()), beat: beat + 1, chips: chips,
                                  scale: scale, intensity: intensity }, 16);
                            if (beat === beats - 1) {
                                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.1, 0)), chipawayHitText, [landed], 20);
                                sound(current, "cobblemon:impact.normal");
                            }
                        }
                    }
                }
                beat++;
                if (beat < beats && !over) current.after(3, strike);
                else {
                    if (landed === 0) {
                        const after = world.observe(actor);
                        const at = (after === null ? current.origin() : after.position()).plus(heading.scale(reach * 0.8));
                        WorldFeedback.emit(world, chipawayScene, 1, at,
                            { moment: "miss", chips: Math.round(chips * 0.6), scale: scale }, 16);
                        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), chipawayMissText, [], 20);
                    }
                    over = true;
                    done(current);
                }
            }
            strike(action);
        }
    });

    // 「无视对手的能力变化」：本招每一拍结算前，把目标本段对应的防御能力等级归零。
    // 目标能力等级读的是原生个体（宝可梦）或共享阶梯（其他生物），归零只作用于这一次结算的本地快照，
    // 不修改目标真正的等级；攻击方自身等级、相性、暴击与特性道具仍由共享结算照常处理。
    PokemonDamage.metadata.define({
        id: "world_combat:move_chipaway/ignore-stages",
        applies: function (context: PokemonDamage.MetadataContext) {
            return context.metadata.move === chipawayId && !!context.targetFacts;
        },
        apply: function (context: PokemonDamage.MetadataContext) {
            const native = context.targetFacts!.data.native;
            if (!native || !native.state) return;
            const stat = context.metadata.category === "special" ? "spd" : "def";
            if (native.state.stages) native.state.stages[stat] = 0;
            if (native.state.layers && native.state.layers.stages) native.state.layers.stages[stat] = 0;
        }
    });
}
