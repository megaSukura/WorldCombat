/** guillotine: one native execution attempt; native damage events and immunity determine its result. */
namespace PokemonSkills {
    export const guillotineResisted = "world_combat:guillotine_resisted";
    WorldCombat.effect(guillotineResisted, 1, 400, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(guillotineResisted, "start", function () { });

    export const guillotineId = "guillotine";
    export const guillotineScene = "world_combat:move_guillotine";
    export const guillotineKillText = "world_combat.move.guillotine.text.kill";
    export const guillotineMissText = "world_combat.move.guillotine.text.miss";
    /** 表现里钳口的参考长度（格）；服务端传 scale = 实际钳口长度 / 这个值。 */
    export const guillotineReference = 2.4;

    /**
     * 处决：钳口合拢，把目标剩下的生命一次夹断。属性免疫（一般系打不到幽灵）返回 "immune"。
     * 目标防御、护甲与韧性不参与——原生伤害事件决定本次是否生效。
     */
    export function guillotineExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" | "resisted" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const move = CobblemonCombat.moveTemplate(guillotineId), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: guillotineId, type: type }));
                return "immune";
            }
        const metadata: any = { kind: "move", move: guillotineId, type: type, category: String(move.category()),
            contact: true, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        if (armor !== null) metadata.armorExcluded = armor.value();
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        const accepted = world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (accepted && (after === null || after.health() <= 0)) return "kill";
        world.effect(guillotineResisted, target, "{}", 400);
        return "resisted";
    }

    actionParameters.define(guillotineId, {
        /** 钳口长度：2.4 + 宽度偏移[−0.15,0.8] + 等级(≥25)偏移[0,0.5]；阔钳 ×1.1；夹 1.8..3.8。 */
        span: formula(
            F.base(2.4).plus(F.body("width").minus(0.9).times(0.55).clamp(-0.15, 0.8))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.guillotine.preference.wide")), F.const(1.1), F.const(1)))
                .clamp(1.8, 3.8).round(2),
            "钳口长度", {
                unit: "格",
                description: "大钳从身前伸出去多远，也是本招的实际射程；身板宽、等级高的个体钳口更长，阔钳式再伸一点。"
            }),
        /** 钳口张角：130 + 宽度偏移[−10,40]；阔钳 ×1.25；夹 90..220。 */
        arc: formula(
            F.base(130).plus(F.body("width").minus(0.9).times(45).clamp(-10, 40))
                .times(F.when(F.pref("wide", text("worldcombat.skill.guillotine.preference.wide")), F.const(1.25), F.const(1)))
                .clamp(90, 220).round(0),
            "钳口张角", {
                unit: "度",
                description: "两片钳口张开多大；身板越宽张得越大，阔钳式再张开一档。张角围出的扇形就是会被夹到的范围。"
            }),
        /** 合拢延迟：14 −（等级 − 目标等级）×0.5（夹 [−6,10]）+ 阔钳 5；夹 7..24。 */
        mark: seconds(
            F.base(14).minus(F.level().minus(F.target("level", text("worldcombat.skill.guillotine.value.targetLevel"))).times(0.5).clamp(-6, 10))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.guillotine.preference.wide")), F.const(5), F.const(0)))
                .clamp(7, 24).round(0),
            "合拢延迟", "钳口张开、真正合上之前的那一小段预告；等级压过对手时合得更快，对手抽身的时间更短。对手等级在施放时读取。"),
        /** 钳齿数量：16 + 物攻偏移[−3,26]；夹 14..50。 */
        grip: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.3).clamp(-3, 26)).clamp(14, 50).round(0),
            "钳齿数量", {
                unit: "个",
                description: "合拢一刻崩出的钳齿碎屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：10 − 速度偏移[−2,2]；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 2)).clamp(6, 16).round(0),
            "起手", "张开钳口、压上去需要多久；它是本族最短的起手。"),
        /** 收招：16 − 速度偏移[−2,2] + 阔钳 4；夹 10..26。 */
        aftercast: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.guillotine.preference.wide")), F.const(4), F.const(0)))
                .clamp(10, 26).round(0),
            "收招", "合上钳口、把身体转回来的时间；它是本族最久的收招，夹空一次就要在原地晾上一会儿。"),
        /** 冷却：80 − 等级(≥20)偏移[0,16]；夹 50..110。 */
        recharge: seconds(
            F.base(80).minus(F.level().minus(20).times(0.27).clamp(0, 16)).clamp(50, 110).round(0),
            "冷却", "两次张开钳口之间的等待；等级越高回得越快，它是本族最短的冷却。")
    });

    stages(guillotineId, [
        { level: 30, values: { span: 2.8 } },
        { level: 45, values: { span: 3.1, arc: 150, mark: 12 } }
    ]);

    describe(guillotineId, [
        { key: "description.0", values: ["span", "arc"] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["recover"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span", "tier.1.arc", "tier.1.mark"] }
    ]);
}
