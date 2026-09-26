/**
 * 逐步击破 / chipaway 的出手方式。
 *
 * 核心念头：朝本次瞄准方向贴脸打出几记短拳，每一拍落在不同高度。判定不靠锁定目标，而靠每一拍一条真实的
 *   短拳路：`action.trace(from, to, half, true)` 取这拍真正的首个接触（前排的身体、同伴或实墙都会截住它），
 *   只有第一个接触是非友方活体时才结算一记 `strike` 接触伤害。目标后退到拳距外、或墙当面截住拳路，剩下的
 *   拍数就落空；不再隔着墙或隔着别人无限群穿。
 *
 * 「无视对手的能力变化」：`skill.ts` 末尾的 `PokemonDamage.metadata` 贡献点在结算前把目标本段对应的防御
 *   能力等级归零（对宝可梦读原生等级、对其他生物同一副阶梯），因而目标的涨防／削防都不参与这一击；
 *   **它只动能力等级，不绕过装备护甲**：攻击方自身等级、相性、暴击、护甲与特性道具仍照常结算。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能出拳，也能空拳；提交与执行都不要求存在敌人，`target` 为 null 时
 *   按 `aim(action)` 读到的方向/点出拳。
 *
 * 与同族分开：ＤＤ金勾臂是原地一整圈横扫、圣剑是一条最长最直的切斩、惩罚是越读越重的一记处刑；
 *   逐步击破凭「贴脸、分高度、接连几拍」认出来，也是本族节奏最快的一招。
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

    /** 方块表面的法线方向，供表现把碎屑沿墙面弹开。 */
    function chipawayFace(face: string): number[] {
        switch (face) {
            case "down": return [0, -1, 0];
            case "up": return [0, 1, 0];
            case "north": return [0, 0, -1];
            case "south": return [0, 0, 1];
            case "west": return [-1, 0, 0];
            case "east": return [1, 0, 0];
            default: return [0, 1, 0];
        }
    }

    define({
        id: chipawayId,
        cooldownParameter: "recharge",
        name: "Chip Away",
        description: "朝瞄准方向贴脸连打几记短拳，每拍落在不同高度，只打拳路真正碰到的第一个非友方；前排的身体和墙会先截住它，目标退出拳距剩下的拍数落空。这一招忽略目标的防御能力等级变化，但装备护甲仍照常减伤。",
        uses: ["朝瞄准方向贴脸连打几拍，每拍落在不同高度", "把目标涨起来的防御等级直接无视掉", "用快而省的连击稳定削血"],
        kind: "aim",
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
            const direction = [heading.x(), heading.y(), heading.z()];
            let beat = 0, landed = 0, blockedAny = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const world = current.world();
                if (landed === 0 && !blockedAny) {
                    const self = world.observe(actor);
                    const at = (self === null ? current.origin() : self.position()).plus(heading.scale(reach * 0.85));
                    WorldFeedback.emit(world, chipawayScene, 1, at,
                        { moment: "miss", chips: Math.round(chips * 0.6), scale: scale }, 16);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), chipawayMissText, [], 20);
                }
                done(current);
            }

            /** 一拍：一条真实短拳路，首个接触决定这一拍打在哪、打不打得到。 */
            function strike(current: CombatAction): void {
                const world = current.world();
                const body = world.observe(actor);
                if (body === null) { finish(current); return; }
                const origin = body.position();
                const feet = origin.y() - body.height() / 2;
                const lift = [0.25, 0.62, 0.4, 0.78][beat % 4];
                const from = WorldCombat.point(origin.x(), feet + lift * body.height(), origin.z());
                const to = from.plus(heading.scale(reach));
                if (beat === 0) sound(current, "minecraft:entity.player.attack.weak");

                const contact = current.trace(from, to, half, true);
                const at = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
                const blocked = victim === null && contact.blocked();
                const blockCell = blocked && contact.blockPosition() !== null ? contact.blockPosition() : null;

                WorldFeedback.emit(world, chipawayScene, 1, at,
                    { moment: "beat", beat: beat + 1, path: [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]],
                      direction: direction, chips: chips, scale: scale, intensity: intensity }, 14);

                if (victim !== null) {
                    const connected = impact(current, contact, chipawayId, power,
                        { damage: damageSpec(chipawayId, "strike"), contact: true });
                    if (connected) {
                        landed++;
                        WorldFeedback.emit(world, chipawayScene, 1, at,
                            { moment: "hit", target: String(victim.ref()), beat: beat + 1, chips: chips,
                              guard: chipawayGuard(world, victim), scale: scale, intensity: intensity }, 16);
                        sound(current, "cobblemon:impact.normal");
                    } else {
                        WorldFeedback.emit(world, chipawayScene, 1, at,
                            { moment: "resist", target: String(victim.ref()), chips: Math.round(chips * 0.5), scale: scale }, 14);
                    }
                } else if (blocked) {
                    blockedAny = true;
                    WorldFeedback.emit(world, chipawayScene, 1, blockCell === null ? at : blockCell,
                        { moment: "block", direction: chipawayFace(contact.blockFace()),
                          chips: Math.round(chips * 0.5), scale: scale }, 14);
                }

                beat++;
                if (beat < beats) { current.after(3, strike); return; }
                if (landed > 0) {
                    const self = world.observe(actor);
                    const hitAt = (self === null ? origin : self.position()).plus(heading.scale(reach * 0.6));
                    WorldFeedback.text(world, hitAt.plus(WorldCombat.point(0, 1.1, 0)), chipawayHitText, [landed], 20);
                }
                finish(current);
            }
            strike(action);
        }
    });

    // 「无视对手的能力变化」：本招每一拍结算前，把目标本段对应的防御能力等级归零。
    // 目标能力等级读的是原生个体（宝可梦）或共享阶梯（其他生物），归零只作用于这一次结算的本地快照，
    // 不修改目标真正的等级；**装备护甲不在归零范围**，攻击方自身等级、相性、暴击与特性道具仍由共享结算照常处理。
    PokemonDamage.metadata.define({
        id: "world_combat:move_chipaway/ignore-stages",
        applies: function (context: PokemonDamage.MetadataContext) {
            return context.metadata.move === chipawayId && !!context.targetFacts;
        },
        apply: function (context: PokemonDamage.MetadataContext) {
            PokemonDamage.ignoreDefenceStages(context);
        }
    });
}
