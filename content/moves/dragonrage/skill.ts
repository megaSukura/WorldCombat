/**
 * 龙之怒 / dragonrage 的出手方式。
 *
 * 核心念头：把一腔怒火压成一颗赤红的龙息弹，正面砸在对手身上；这一击不与攻防比较，无论对方多硬都固定
 * 削掉 40 点生命（只有属性免疫能挡住），并把它撞退、短时间按住。
 *
 * 两幕 + 收：
 *   起（windup，提交前）：怒火从身上窜起、在胸前收成一颗将成未成的赤弹，只播预告、可被打断。
 *   砸（execute → impact / erupt）：提交后龙息弹沿直线飞出（`LivingActions.projectile`），撞上第一个非友方时
 *       按固定伤害结算（`dragonrageRawHit`，绕过攻防）；猛撞式再把人顶开、按 `pinTicks` 按住它；
 *       怒爆式改为在落点炸开，`blastRadius` 内的敌人各吃固定伤害并被向外推开。
 *   散（fade）：弹体没人可撞就飞到头自行散去。
 *
 * 固定伤害是这招的承诺：`damage` 不由攻防、相性或暴击改变；变化只落在射程、撞退、爆发范围、按住时长这些
 * 按精灵数据取值的部分上。
 */
namespace PokemonSkills {
    const dragonrageScene = "world_combat:move_dragonrage";
    const dragonrageHitText = "world_combat.move.dragonrage.text.hit";
    const dragonrageEruptText = "world_combat.move.dragonrage.text.erupt";
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
        description: "把满腔怒火压成一颗赤红的龙息弹正面砸出去：这一击不与攻防比较，无论对手多硬都固定削掉 40 点生命（只有属性免疫能挡住），把人撞退并短暂按住；怒爆式改为在落点炸开、罩住一片。",
        uses: ["用固定伤害处理高防目标", "把冲上来的敌人撞退并按住", "怒爆式一口气削掉挤在一起的一片"],
        kind: "enemy",
        range: 7,
        maxRange: 13,
        prepare: 11,
        active: 0,
        recover: 10,
        cooldown: 34,
        style: "rage",
        defaults: { erupt: false, ai: { maxChase: 11, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: config && config.erupt === true ? p("dragonrage", "blastRadius", pokemon) : p("dragonrage", "radius", pokemon) * 1.6,
                geometry: config && config.erupt === true ? "area" : "line", style: "rage", color: 0xE0563A,
                label: config && config.erupt === true ? "龙之怒·怒爆" : "龙之怒" };
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
                JSON.stringify({ moment: "rage", erupt: config && config.erupt === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const erupt = !!(config && config.erupt);
            const damage = p("dragonrage", "damage", action);
            const reach = p("dragonrage", "reach", action);
            const velocity = p("dragonrage", "velocity", action);
            const radius = p("dragonrage", "radius", action);
            const push = p("dragonrage", "push", action);
            const blastRadius = p("dragonrage", "blastRadius", action);
            const pinTicks = Math.max(1, Math.round(p("dragonrage", "pinTicks", action)));
            const motes = Math.max(8, Math.round(p("dragonrage", "motes", action)));
            const cap = Math.max(1, Math.round(p("dragonrage", "maximumTargets", action)));
            const direction = aim(action);
            const chest = origin.plus(WorldCombat.point(0, 0.45, 0));
            const scale = radius / 0.4;
            const intensity = Math.max(0.7, Math.min(2.2, motes / 24));
            let settled = false;

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
                sprite: "cobblemon:generic/burning_rock", tint: 0xE0603A, glow: true,
                scale: Math.max(0.8, Math.min(1.8, scale))
            };
            LivingActions.projectile(action, {
                speed: velocity, range: reach, gravity: 0, radius: radius, direction: direction,
                lifetime: Math.max(28, Math.round(reach / Math.max(0.2, velocity) + 28)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    if (erupt) {
                        WorldFeedback.emit(scope, dragonrageScene, 1, hit.position(),
                            { moment: "erupt", scale: blastRadius / 1.8, motes: motes, intensity: intensity }, 32);
                        let hits = 0;
                        const region = WorldGeometry.ring(hit.position(), 0, blastRadius, { below: 1.5, above: 3 });
                        WorldGeometry.selectEnemies(scope, region, function (enemy: CombatActor, facts: CombatObservation) {
                            if (hits >= cap) return;
                            if (!dragonrageRawHit(current, enemy, damage)) return;
                            hits++;
                            shove(current, enemy, facts.position().minus(hit.position()));
                            WorldFeedback.emit(scope, dragonrageScene, 1, facts.position(),
                                { moment: "impact", target: String(enemy.ref()), scale: scale, motes: motes, intensity: intensity }, 24);
                        });
                        sound(current, "minecraft:entity.dragon_fireball.explode");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)),
                            hits > 0 ? dragonrageEruptText : dragonrageMissText, hits > 0 ? [hits] : [], 28);
                        finish(current);
                        return;
                    }
                    if (!dragonrageRawHit(current, victim, damage)) { finish(current); return; }
                    shove(current, victim, direction);
                    WorldEffects.apply(scope, victim, "rooted", {}, pinTicks);
                    WorldFeedback.emit(scope, dragonrageScene, 1, hit.position(),
                        { moment: "impact", target: String(victim.ref()), scale: scale, motes: motes, intensity: intensity }, 28);
                    sound(current, "cobblemon:impact.dragon");
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), dragonrageHitText, [Math.round(damage)], 28);
                    finish(current);
                }
            }, function (current: CombatAction) {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    const at = current.targetPosition();
                    WorldFeedback.emit(scope, dragonrageScene, 1, at, { moment: "fade", scale: scale, motes: motes }, 20);
                    if (!settled) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), dragonrageMissText, [], 22);
                }
                finish(current);
            });
        }
    });
}
