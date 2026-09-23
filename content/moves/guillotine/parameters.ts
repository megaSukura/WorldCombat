/**
 * 断头钳 / guillotine —— 参数与处决结算。
 *
 * 原生事实：Normal／物理／威力 0／命中 30／PP 5／单体／接触；ohko: true——只要命中就一击濒死；
 *   30% 命中由双方等级差修正（Cobblemon 1.8，15 位已实装学习者）。
 *
 * 翻译：把「用大钳子夹断对手」落成一记**贴身的扇形钳合**——大钳从两侧张开、合拢，罩住身前那一段扇形；
 *   合拢一刻还在钳口里的目标被一次夹断。它是四记一击必杀里最短、最快的一记：起手短、张口快，
 *   但收招最久——夹空一次，自己就要在原地晾上好一会儿。
 *
 * 与同族分开（四记都靠「预告形状」被认出）：
 *   地裂     —— 远程、坑在目标脚下的地面，只有站在地上的人中招；
 *   角钻     —— 施法者沿一条**直线**钻过去，会位移、会撞墙；
 *   断头钳   —— 贴身的**扇形**钳合，最短最快、收招最久，钳口张开的角度就是它的范围；
 *   绝对零度 —— 目标周围一整圈**半径**冻杀，唯一能同时放倒多个。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   span    钳口长度 2.4 + 碰撞箱宽度偏移 + 等级(≥25)偏移；身宽、等级高的人钳口伸得更长，也是实际射程。
 *   arc     钳口张角 130° + 碰撞箱宽度偏移；身板越宽，钳口张开越大。
 *   mark    合拢延迟 14 −（等级差）×0.5；等级压过对手时合得更快，对手抽身的时间更短。
 *   grip    钳齿数量 16 + 物攻偏移；驱动表现密度。
 *   tempo／aftercast／recharge 速度与等级定起手、收招、冷却。
 *
 * 配置 `wide`（阔钳式）双向取舍：开＝钳口张角 ×1.25、钳口长度 ×1.1，代价是合拢延迟 +5、收招 +4
 *   （更好夹中偏开的目标，代价是更慢、夹空更亏）；关（窄钳式）＝合得更快、收招更短，但只夹得住正前方。
 */
namespace PokemonSkills {
    export const guillotineId = "guillotine";
    export const guillotineScene = "world_combat:move_guillotine";
    export const guillotineKillText = "world_combat.move.guillotine.text.kill";
    export const guillotineMissText = "world_combat.move.guillotine.text.miss";
    /** 表现里钳口的参考长度（格）；服务端传 scale = 实际钳口长度 / 这个值。 */
    export const guillotineReference = 2.4;

    /**
     * 处决：钳口合拢，把目标剩下的生命一次夹断。属性免疫（一般系打不到幽灵）返回 "immune"。
     * 目标防御、护甲与韧性不参与——只有属性关系能挡。
     */
    export function guillotineExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" {
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
        world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (after !== null && after.health() > 0) world.health(target, -after.health(), "world_combat:guillotine_execute");
        return "kill";
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
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span", "tier.1.arc", "tier.1.mark"] }
    ]);
}
