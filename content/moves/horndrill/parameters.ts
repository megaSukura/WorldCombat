/**
 * 角钻 / horndrill —— 参数与处决结算。
 *
 * 原生事实：Normal／物理／威力 0／命中 30／PP 5／单体／接触；ohko: true——只要命中就一击濒死；
 *   30% 命中由双方等级差修正（Cobblemon 1.8，25 位已实装学习者）。
 *
 * 翻译：把「用旋转的角刺入对手」落成一次**施法者本人的直线冲钻**——蹲身起旋，把身体拧成一支钻头，
 *   沿锁定的一条线高速钻出去；线路上第一个挡路的活体被钻尖贯穿、一次结清。它是四记一击必杀里唯一
 *   会位移的一记，也是唯一撞上墙就停在原地的：对手让开这条线，钻头就只能扎进石头里。
 *
 * 与同族分开（四记都靠「预告形状」被认出）：
 *   地裂     —— 远程、坑在目标脚下的地面，只有站在地上的人中招，事后留裂缝；
 *   角钻     —— 施法者沿一条**直线**钻过去，会位移、会撞墙，留下角钻特有的螺旋钻屑；
 *   断头钳   —— 贴身的**扇形**钳合，最短最快，收招最久；
 *   绝对零度 —— 目标周围一整圈**半径**冻杀，唯一能同时放倒多个。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   span    冲程 6.0 + 等级(≥20)偏移 + 速度偏移；等级高、腿快的人钻得更远，也是实际射程。
 *   girth   钻头判定 0.6 + 身高偏移 + 体重偏移；个高体沉的人钻头更粗，更难被侧身让开。
 *   thrust  冲速 0.85 + 速度偏移；腿快的人钻得更急。
 *   mark    起钻蓄势 22 −（等级差）×0.6 + 扩钻 6；等级压过对手时蓄势更短，对手让开的时间更少。
 *   bore    钻屑量 18 + 物攻偏移；驱动表现密度。
 *   tempo／aftercast／recharge 速度与等级定起手、收招、冷却。
 *
 * 配置 `wide`（扩钻式）双向取舍：开＝钻头判定 ×1.35，代价是冲程 ×0.85、蓄势 +6、收招 +4（更慢更短、更好躲，
 *   但不在正中也会被扫到）；关（细钻式）＝更长更快、收招更短，但在差之毫厘时会擦身而过。两向各有局面。
 */
namespace PokemonSkills {
    export const horndrillId = "horndrill";
    export const horndrillScene = "world_combat:move_horndrill";
    export const horndrillKillText = "world_combat.move.horndrill.text.kill";
    export const horndrillMissText = "world_combat.move.horndrill.text.miss";
    /** 表现里钻头的参考半径（格）；服务端传 scale = 实际判定半径 / 这个值。 */
    export const horndrillReference = 0.6;

    /**
     * 处决：钻尖贯穿，把目标剩下的生命一次结清。属性免疫（一般系打不到幽灵）返回 "immune"。
     * 目标防御、护甲与韧性不参与——只有属性关系能挡。
     */
    export function horndrillExecute(action: CombatAction, target: CombatActor): "kill" | "immune" | "miss" {
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
        world.hurt(target, body.health() + body.maxHealth(), JSON.stringify(metadata));
        const after = world.observe(target);
        if (after !== null && after.health() > 0) world.health(target, -after.health(), "world_combat:horndrill_execute");
        return "kill";
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
