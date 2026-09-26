/** horndrill: one native execution attempt; native damage events and immunity determine its result. */
namespace PokemonSkills {
    export const horndrillResisted = "world_combat:horndrill_resisted";
    WorldCombat.effect(horndrillResisted, 1, 400, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(horndrillResisted, "start", function () { });

    export const horndrillId = "horndrill";
    export const horndrillScene = "world_combat:move_horndrill";
    export const horndrillKillText = "world_combat.move.horndrill.text.kill";
    export const horndrillMissText = "world_combat.move.horndrill.text.miss";
    /** 表现里钻头的参考半径（格）；服务端传 scale = 实际判定半径 / 这个值。 */
    export const horndrillReference = 0.6;

    /**
     * 处决：钻尖贯穿，把目标剩下的生命一次结清。属性免疫（一般系打不到幽灵）返回 "immune"。
     * 目标防御、护甲与韧性不参与——原生伤害事件决定本次是否生效。
     */
    export function horndrillExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" | "resisted" {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target)) return "miss";
        const body = world.observe(target);
        if (body === null || body.health() <= 0) return "miss";
        const move = CobblemonCombat.moveTemplate(horndrillId), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: horndrillId, type: type }));
                return "immune";
            }
        const metadata: any = { kind: "move", move: horndrillId, type: type, category: String(move.category()),
            contact: true, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        if (armor !== null) metadata.armorExcluded = armor.value();
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        const accepted = world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (accepted && (after === null || after.health() <= 0)) return "kill";
        world.effect(horndrillResisted, target, "{}", 400);
        return "resisted";
    }

    actionParameters.define(horndrillId, {
        /** 冲程：6.0 + 等级(≥20)偏移[0,1.6] + 速度偏移[−0.8,1.8]；扩钻 ×0.85；夹 4..10。 */
        span: formula(
            F.base(6.0).plus(F.level().minus(20).times(0.04).clamp(0, 1.6))
                .plus(F.stat("speed").minus(60).times(0.015).clamp(-0.8, 1.8))
                .times(F.when(F.pref("wide", text("worldcombat.skill.horndrill.preference.wide")), F.const(0.85), F.const(1)))
                .clamp(4, 10).round(2),
            "冲程", {
                unit: "格",
                description: "一次钻出去多远，也是本招的实际射程；等级高、腿快的个体钻得更远，扩钻式收得更短。"
            }),
        /** 钻头判定：0.6 + 身高偏移[−0.06,0.5] + 体重偏移[−0.05,0.25]；扩钻 ×1.35；夹 0.45..1.35。 */
        girth: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.06, 0.5))
                .plus(F.body("weight").minus(60).times(0.0008).clamp(-0.05, 0.25))
                .times(F.when(F.pref("wide", text("worldcombat.skill.horndrill.preference.wide")), F.const(1.35), F.const(1)))
                .clamp(0.45, 1.35).round(2),
            "钻头判定", {
                unit: "格",
                description: "旋转的钻身扫过的横向判定半径；个高体沉的人钻头更粗，扩钻式再宽一圈。"
            }),
        /** 冲速：0.85 + 速度偏移[−0.2,0.5]；夹 0.55..1.4。 */
        thrust: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5)).clamp(0.55, 1.4).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲刺时每刻前进的距离；腿快的个体钻得更急。"
            }),
        /** 起钻蓄势：22 −（等级 − 目标等级）×0.6（夹 [−8,14]）+ 扩钻 6；夹 10..36。 */
        mark: seconds(
            F.base(22).minus(F.level().minus(F.target("level", text("worldcombat.skill.horndrill.value.targetLevel"))).times(0.6).clamp(-8, 14))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.horndrill.preference.wide")), F.const(6), F.const(0)))
                .clamp(10, 36).round(0),
            "起钻蓄势", "角高速旋转、身体压成钻头、真正冲出去前的那段预告；等级压过对手时蓄势更短，对手让开的时间更少。对手等级在施放时读取。"),
        /** 钻屑量：18 + 物攻偏移[−4,28]；夹 16..56。 */
        bore: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 28)).clamp(16, 56).round(0),
            "钻屑量", {
                unit: "个",
                description: "钻尖咬入时崩出的螺旋钻屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：14 − 速度偏移[−2,3]；夹 9..20。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(9, 20).round(0),
            "起手", "蹲身起旋、把身体拧成钻头需要多久；速度越快越短。"),
        /** 收招：12 − 速度偏移[−2,2] + 扩钻 4；夹 8..24。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.horndrill.preference.wide")), F.const(4), F.const(0)))
                .clamp(8, 24).round(0),
            "收招", "钻到尽头停住、稳住身形的时间；扩钻式那支更粗的钻头收得更久，落空也更吃亏。"),
        /** 冷却：96 − 等级(≥20)偏移[0,18]；夹 60..130。 */
        recharge: seconds(
            F.base(96).minus(F.level().minus(20).times(0.3).clamp(0, 18)).clamp(60, 130).round(0),
            "冷却", "两次起钻之间的等待；等级越高回得越快。")
    });

    stages(horndrillId, [
        { level: 35, values: { span: 7.0 } },
        { level: 50, values: { span: 7.8, girth: 0.75, mark: 18 } }
    ]);

    describe(horndrillId, [
        { key: "description.0", values: ["span","girth"] },
        { key: "description.1", values: ["mark"] },
        { key: "description.2", values: ["thrust"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.span", "tier.1.girth", "tier.1.mark"] }
    ]);
}
