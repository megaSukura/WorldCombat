/**
 * 龙之怒 / dragonrage 的出手方式。
 *
 * 核心念头：把一腔怒火压成一颗赤红的龙息弹，正面砸在对手身上；这一击不与攻防比较，无论对方多硬都固定
 * 削掉 40 点生命（只有属性免疫能挡住），并把它撞退。
 *
 * 两幕 + 收：
 *   起（windup，提交前）：怒火从身上窜起、在胸前收成一颗将成未成的赤弹，只播预告、可被打断。
 *   砸（execute → impact / wall / fade）：提交后龙息弹沿自由瞄准方向直飞（`LivingActions.projectile`），撞上
 *       第一个非友方时按固定伤害结算（`dragonrageRawHit`，绕过攻防）并把人顶开；撞到方块时散一团怒火，
 *       没人可撞就飞到头自行散去。
 *
 * 固定伤害是这招的承诺：`damage` 不由攻防、相性或暴击改变；变化只落在射程、弹速、判定与撞退这些按精灵
 * 数据取值的部分上。配置 `swift`（急袭式）把弹速提上去、射程压下来，是唯一的方向性取舍。
 *
 * 选取：`kind: "aim"`——朝方向或世界点自由直射，提交后可空放；命中权限仍由命中层判断。
 */
namespace PokemonSkills {
    const dragonrageScene = "world_combat:move_dragonrage";
    const dragonrageHitText = "world_combat.move.dragonrage.text.hit";
    const dragonrageWallText = "world_combat.move.dragonrage.text.wall";
    const dragonrageMissText = "world_combat.move.dragonrage.text.miss";

    /** 固定伤害的直接结算入口（与地球上投／黑夜魔影同一套做法）：只被属性免疫挡住，防御不参与。 */
    export function dragonrageRawHit(action: CombatAction, target: CombatActor, amount: number): boolean {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        const move = CobblemonCombat.moveTemplate("dragonrage"), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: "dragonrage", type: type }));
                return false;
            }
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        const metadata: any = { kind: "move", move: "dragonrage", type: type, category: String(move.category()),
            contact: false, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    define({
        id: "dragonrage",
        cooldownParameter: "recharge",
        name: "Dragon Rage",
        description: "把满腔怒火压成一颗赤红的龙息弹朝瞄准方向直射出去：这一击不与攻防比较，无论对手多硬都固定削掉 40 点生命（只有属性免疫能挡住），撞上第一个敌人即结算并把它顶开；急袭式飞得更急、但射程更短。",
        uses: ["用固定伤害处理高防目标", "自由直射，撞上第一个敌人就削固定 40", "急袭式加速抢在对手走位之前命中"],
        kind: "aim",
        range: 7,
        maxRange: 13,
        prepare: 11,
        active: 0,
        recover: 10,
        cooldown: 34,
        style: "rage",
        defaults: { swift: false, ai: { maxChase: 11, value: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonrage", "radius", pokemon) * 1.6, geometry: "line", style: "rage", color: 0xE0563A,
                label: config && config.swift === true ? "龙之怒·急袭" : "龙之怒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragonrage"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragonrage", "tempo", context)),
                recover: Math.round(p("dragonrage", "settle", context)),
                cooldown: Math.round(p("dragonrage", "recharge", context)),
                active: 0,
                range: p("dragonrage", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragonrage:windup", dragonrageScene, 1, action.origin(),
                JSON.stringify({ moment: "rage", swift: config && config.swift === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const damage = p("dragonrage", "damage", action);
            const reach = p("dragonrage", "reach", action);
            const velocity = p("dragonrage", "velocity", action);
            const radius = p("dragonrage", "radius", action);
            const push = p("dragonrage", "push", action);
            const motes = Math.max(8, Math.round(p("dragonrage", "motes", action)));
            const direction = aim(action);
            const chest = origin.plus(WorldCombat.point(0, 0.45, 0));
            const scale = radius / 0.4;
            // 固定伤害的反馈不随体型夸大：强度只由怒焰量轻度抬高，并有上限。
            const intensity = Math.max(0.7, Math.min(1.6, motes / 30));
            let settled = false, landed = false, walled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            /** 把目标沿给定的方向顶开 `push` 格。 */
            function shove(current: CombatAction, target: CombatActor, vector: CombatPoint): void {
                if (vector.length() < 0.05) return;
                current.world().displace(target, vector.unit().scale(push));
            }

            sound(action, "minecraft:entity.ender_dragon.growl");
            WorldFeedback.emit(world, dragonrageScene, 1, chest,
                { moment: "launch", scale: scale, motes: motes, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()] }, 22);

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/energyorb", tint: 0xE0563A, glow: true,
                scale: Math.max(0.8, Math.min(1.6, scale))
            };
            LivingActions.projectile(action, {
                speed: velocity, range: reach, gravity: 0, radius: radius, direction: direction,
                lifetime: Math.max(28, Math.round(reach / Math.max(0.2, velocity) + 28)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null) {
                        // 方块散怒火：弹体撞墙即碎，给出明确的落点，不当命中。
                        if (hit.blocked()) {
                            walled = true;
                            WorldFeedback.emit(scope, dragonrageScene, 1, hit.position(),
                                { moment: "wall", scale: scale, motes: motes, intensity: intensity }, 22);
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.0, 0)), dragonrageWallText, [], 22);
                            sound(current, "minecraft:item.shield.break");
                        }
                        return;
                    }
                    if (!scope.valid(victim) || scope.friendly(victim)) return;
                    if (!dragonrageRawHit(current, victim, damage)) { finish(current); return; }
                    landed = true;
                    shove(current, victim, direction);
                    WorldFeedback.emit(scope, dragonrageScene, 1, hit.position(),
                        { moment: "impact", target: String(victim.ref()), scale: scale, motes: motes, intensity: intensity }, 28);
                    sound(current, "cobblemon:impact.dragon");
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), dragonrageHitText, [Math.round(damage)], 28);
                    finish(current);
                }
            }, function (current: CombatAction) {
                const scope = current.world(), body = scope.observe(current.actor());
                if (!landed && !walled && body !== null) {
                    WorldFeedback.emit(scope, dragonrageScene, 1, current.targetPosition(), { moment: "fade", scale: scale, motes: motes }, 20);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.2, 0)), dragonrageMissText, [], 22);
                }
                finish(current);
            });
        }
    });
}
