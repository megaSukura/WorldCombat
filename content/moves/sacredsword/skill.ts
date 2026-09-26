/**
 * 圣剑 / sacredsword 的出手方式。
 *
 * 核心念头：朝本次瞄准方向踏一步、送出一记极长的直斩。判定不锁定提交时的目标，而是一条真实的长窄剑线：
 *   `action.trace(near, far, edge, true)` 取这条线的首个接触（前排的身体、同伴或实墙都会截住它）；只有首个
 *   接触是非友方活体时才结算一记 `cut` 接触斩击。墙当面截住就停在墙面、不隔墙伤人；空斩照常发生。
 *   目标若在刃程内且压上步被墙挡住，就从**实际停下的位置**出剑，不再对原来的远处目标远程结算。
 *
 * 「无视对手的能力变化」：`skill.ts` 末尾的 `PokemonDamage.metadata` 贡献点在结算前把目标本段对应的防御
 *   能力等级归零（对宝可梦读原生等级、对其他生物同一副阶梯），因而目标的涨防／削防都不参与这一斩；
 *   **它只动能力等级，不绕过装备护甲**：攻击方自身等级、相性、暴击、护甲与特性道具仍照常结算。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能出剑，点选敌人只是帮助对准；提交与执行都不要求存在敌人。
 *
 * 与同族分开：逐步击破是贴脸分高度连击、ＤＤ金勾臂是原地整圈横扫、惩罚从对手取力；
 *   圣剑凭「最长的一记正前切斩」认出来。
 */
namespace PokemonSkills {
    const sacredswordScene = "world_combat:move_sacredsword";
    const sacredswordHitText = "world_combat.move.sacredsword.text.hit";
    const sacredswordMissText = "world_combat.move.sacredsword.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function sacredswordHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 方块表面的法线方向，供表现把被截断的刃光沿墙面弹开。 */
    function sacredswordFace(face: string): number[] {
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
        freeMovement: true,
        id: sacredswordId,
        cooldownParameter: "recharge",
        name: "Sacred Sword",
        description: "朝瞄准方向踏一步，送出一记极长极窄的直斩；剑线只碰到的第一个非友方才吃这一刀，墙当面截住就停在墙面。这一刀忽略目标的防御能力等级变化，但装备护甲仍照常减伤；点选敌人只帮助对准，空斩也能发生。",
        uses: ["把长角拉满，朝瞄准方向送出一记最长的切斩", "把目标涨起来的防御等级直接无视掉", "在射程外缘一刀切开单个目标"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.6,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sword",
        defaults: { iaido: false, ai: { maxChase: 6, breakGuard: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(sacredswordId, "reach", pokemon), geometry: "line", style: "sword", color: 0xE8E0A8,
                label: config && config.iaido === true ? "圣剑·居合" : "圣剑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[sacredswordId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(sacredswordId, "tempo", context)),
                recover: Math.round(p(sacredswordId, "aftercast", context)),
                cooldown: Math.round(p(sacredswordId, "recharge", context)),
                active: 0,
                range: p(sacredswordId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sacredsword:draw", sacredswordScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", windup: prepare, iaido: config && config.iaido === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const heading = sacredswordHeading(aim(action));
            const reach = Math.max(2.6, p(sacredswordId, "reach", action));
            const edge = Math.max(0.22, p(sacredswordId, "edge", action));
            const depth = Math.max(1.6, p(sacredswordId, "depth", action));
            const lunge = Math.max(0, p(sacredswordId, "lunge", action));
            const power = p(sacredswordId, "cut", action);
            const gleam = Math.max(8, Math.round(p(sacredswordId, "gleam", action)));
            const iaido = config && config.iaido === true ? 1 : 0;
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const baseScale = Math.max(0.6, Math.min(1.9, reach / 3.2));
            const baseIntensity = Math.max(0.6, Math.min(2.4, power / 90));
            const direction = [heading.x(), heading.y(), heading.z()];

            // 有推荐敌人且还够不到时，朝它压上有限的半步；只压到判定边缘，撞到墙或它自己就停在实际位置。
            if (target !== null && world.valid(target) && !world.friendly(target) && lunge > 0.02) {
                const toTarget = world.observe(target);
                if (toTarget !== null) {
                    const delta = toTarget.position().minus(origin);
                    const distance = delta.length();
                    if (distance > reach * 0.85) {
                        const step = Math.min(lunge, Math.max(0, distance - reach * 0.7));
                        if (step > 0.02) world.displace(actor, delta.unit().scale(step));
                    }
                }
            }
            const arrived = world.observe(actor);
            const at = arrived === null ? origin : arrived.position();
            const height = (arrived === null ? self : arrived).height();

            // 真实长窄剑线：从身前偏下一侧斜拉到刃程远端，判定与画面共用同一条线。
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const nearSide = Math.min(0.35, reach * 0.12), farSide = Math.min(0.3, reach * 0.1);
            const near = WorldCombat.point(at.x() + side.x() * nearSide, at.y() - height * 0.3, at.z() + side.z() * nearSide)
                .plus(heading.scale(0.25));
            const farBase = at.plus(heading.scale(reach));
            const far = WorldCombat.point(farBase.x() - side.x() * farSide, near.y() + depth * 0.4, farBase.z() - side.z() * farSide);

            const contact = action.trace(near, far, edge, true);
            const stop = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const blade = [[near.x(), near.y(), near.z()], [stop.x(), stop.y(), stop.z()]];

            sound(action, "minecraft:item.trident.hit");
            WorldFeedback.emit(world, sacredswordScene, 1, at,
                { moment: "slash", path: blade, direction: direction, reach: reach, gleam: gleam,
                  scale: baseScale, intensity: baseIntensity, iaido: iaido }, 20);

            if (victim !== null) {
                const landed = impact(action, contact, sacredswordId, power,
                    { damage: damageSpec(sacredswordId, "cut"), contact: true, slice: true });
                if (landed) {
                    WorldFeedback.emit(world, sacredswordScene, 1, stop,
                        { moment: "cut", target: String(victim.ref()), gleam: gleam, scale: baseScale, intensity: baseIntensity }, 20);
                    WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 1.15, 0)), sacredswordHitText, [], 22);
                    sound(action, "cobblemon:impact.fighting");
                } else {
                    // 伤害被拒（免疫、不可选中）：不声称命中。
                    WorldFeedback.emit(world, sacredswordScene, 1, stop,
                        { moment: "miss", target: String(victim.ref()), gleam: Math.round(gleam * 0.6), scale: baseScale }, 16);
                    WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 1.1, 0)), sacredswordMissText, [], 20);
                    sound(action, "minecraft:entity.player.attack.sweep");
                }
            } else if (contact.blocked()) {
                // 墙截线：刃光停在真实方块格与表面，不隔墙结算。
                const cell = contact.blockPosition() === null ? stop : contact.blockPosition()!;
                WorldFeedback.emit(world, sacredswordScene, 1, cell,
                    { moment: "block", direction: sacredswordFace(contact.blockFace()),
                      gleam: Math.round(gleam * 0.6), scale: baseScale }, 18);
                sound(action, "minecraft:entity.player.attack.sweep");
            } else {
                WorldFeedback.emit(world, sacredswordScene, 1, stop,
                    { moment: "miss", gleam: Math.round(gleam * 0.6), scale: baseScale }, 16);
                WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 1.0, 0)), sacredswordMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.sweep");
            }
            done(action);
        }
    });

    // 「无视对手的能力变化」：本招结算前，把目标本段对应的防御能力等级归零。
    // 归零只作用于这一次结算的本地快照，不修改目标真正的等级；**装备护甲不在归零范围**，
    // 攻击方自身等级与其余结算照常。
    PokemonDamage.metadata.define({
        id: "world_combat:move_sacredsword/ignore-stages",
        applies: function (context: PokemonDamage.MetadataContext) {
            return context.metadata.move === sacredswordId && !!context.targetFacts;
        },
        apply: function (context: PokemonDamage.MetadataContext) {
            PokemonDamage.ignoreDefenceStages(context);
        }
    });
}
