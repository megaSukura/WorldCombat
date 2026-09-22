/**
 * ＤＤ金勾臂 / darkestlariat —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：恶、物理、威力 85、命中 100、PP 10、优先度 0、接触、无追加效果
 *   （16 位学习者）。描述「旋转双臂打向对手。无视对手的能力变化，直接给予伤害。」——
 *   即这一击按目标处于中性能力等级结算。
 *
 * 翻译：把「旋转双臂」落成**原地旋身一整圈、双臂横抡把身周清开的环形横扫**——旋转的势头从侧面切入，
 *   对手正面对防的架势护不到侧后，所以它涨起来的防御等级挡不住这一圈。它是本族唯一扫一整圈的招：
 *   不是挑一个方向，而是把贴身的每个人一起抡开。
 *
 * 与同族分开：逐步击破是贴脸分高度的连击、圣剑是一条最长的正前切斩、惩罚从对手身上取力；
 *   ＤＤ金勾臂凭「原地一整圈、一次抡开身边所有人」认出来。
 *
 * 「无视能力变化」的落点：`skill.ts` 末尾注册的 `PokemonDamage.metadata` 贡献点，在结算前把目标本段
 *   对应的防御能力等级归零；攻击方自身等级、相性、暴击、护甲与特性道具仍照常结算。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   sweep      横扫威力：物攻定臂力、**体重**给旋转的势头、等级给狠劲；广旋式把力摊到更大一圈。
 *   radius     扫击半径：身高给臂展与旋身幅度、速度给转速，也是实际射程；广旋式把圈拉大。
 *   depth      覆盖高度：身高决定这一圈扫到多高。
 *   push       顶开距离：体重给势头、物攻给力度；广旋式把人抡得更开。
 *   spin       旋转圈数：速度决定转几圈，驱动表现。
 *   gales      风痕量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏、等级让冷却回得更快；广旋式更慢更费。
 *
 * 配置 `wide`（广旋式，默认关）双向取舍：开启＝半径 ×1.3、顶开 ×1.25、覆盖更大一圈，代价是每个目标 ×0.88、
 *   起手 +2 刻、冷却 +6 刻；关闭（紧旋式）＝圈更小但每下 ×1.1、节奏更快。两向各有局面：被围住用广旋，
 *   只贴一个目标用紧旋更划算。
 *
 * 伤害段 `sweep` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算，防御能力等级被本招忽略。
 */
namespace PokemonSkills {
    export const darkestlariatId = "darkestlariat";
    const darkestlariatMoveText = "worldcombat.skill.darkestlariat.preference.wide";

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯。 */
    function darkestlariatStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return String(actor.domain()) === "cobblemon" ? NativeEffects.read(world, actor).stages : CombatStages.read(world, actor);
    }

    /** 目标身上防御向能力里正面等级的总和（防与特防）；0 表示此刻没有可被本招无视的涨防。 */
    export function darkestlariatGuard(world: CombatWorld, actor: CombatActor): number {
        const stages = darkestlariatStages(world, actor);
        let total = 0;
        ["def", "spd"].forEach(function (stat) { const value = stages[stat] || 0; if (value > 0) total += value; });
        return total;
    }

    actionParameters.define(darkestlariatId, {
        /** 横扫威力：66 + 物攻偏移[−14,34] ×0.42 + 体重偏移[0,14] ×0.03 + 等级偏移[−6,14] ×0.25；广旋 ×0.88 / 紧旋 ×1.1；夹 50..150。 */
        sweep: formula(
            F.base(66).plus(F.stat("attack").minus(60).times(0.42).clamp(-14, 34))
                .plus(F.body("weight").minus(60).times(0.03).clamp(0, 14))
                .plus(F.level().minus(28).times(0.25).clamp(-6, 14))
                .times(F.when(F.pref("wide", text(darkestlariatMoveText)), F.const(0.88), F.const(1.1)))
                .clamp(50, 150).round(1),
            "横扫威力", {
                unit: "威力",
                description: "这一圈抡在每个人身上的基础威力；物攻定臂力、体重给旋转的势头、等级给狠劲。广旋式把力摊到更大一圈、紧旋式更集中。对手防御、相性与暴击在命中时另算，**目标本段的防御能力等级被这一招忽略**。"
            }),
        /** 扫击半径：2.6 + 身高偏移[−0.2,0.9] ×0.35 + 速度偏移[−0.15,0.35] ×0.004；广旋 ×1.3；夹 2.2..4.6。 */
        radius: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.9))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35))
                .times(F.when(F.pref("wide", text(darkestlariatMoveText)), F.const(1.3), F.const(1)))
                .clamp(2.2, 4.6).round(2),
            "扫击半径", {
                unit: "格",
                description: "双臂抡开能扫到多大一圈，也是本招的实际射程来源；身高给臂展、速度给转速，广旋式把圈拉大。画面里那圈风痕就是判定范围。"
            }),
        /** 覆盖高度：1.1 + 身高偏移[−0.15,0.7] ×0.3；夹 0.9..1.9。 */
        depth: formula(
            F.base(1.1).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.15, 0.7)).clamp(0.9, 1.9).round(2),
            "覆盖高度", {
                unit: "格",
                description: "这一圈从脚上覆盖到多高；高大的个体抡得更高。"
            }),
        /** 顶开距离：0.45 + 体重偏移[0,0.5] ×0.0025 + 物攻偏移[−0.05,0.3] ×0.004；广旋 ×1.25；夹 0.25..1.4。 */
        push: formula(
            F.base(0.45).plus(F.body("weight").minus(60).times(0.0025).clamp(0, 0.5))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.05, 0.3))
                .times(F.when(F.pref("wide", text(darkestlariatMoveText)), F.const(1.25), F.const(1)))
                .clamp(0.25, 1.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "被抡中的人向外被顶开多远；体重给势头、物攻给力度，广旋式抡得更开。"
            }),
        /** 旋转圈数：2 + 速度偏移[−0.5,1.5] ×0.02；夹 2..5。 */
        spin: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.5)).clamp(2, 5).round(0),
            "旋转圈数", {
                unit: "圈",
                description: "原地转几圈；速度越快转得越多。画面里风痕的圈数与它一致。"
            }),
        /** 风痕量：16 + 物攻偏移[−3,10] ×0.14；夹 12..38。 */
        gales: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.14).clamp(-3, 10)).clamp(12, 38).round(0),
            "风痕量", {
                unit: "道",
                description: "旋转时甩出的风痕数量，由物攻换算；粒子按它发射，画面里的道数与机制一致。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2.5] ×0.03 + 广旋 +2；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("wide", text(darkestlariatMoveText)), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "沉重心、把旋转带起来的时间；速度越快越短，广旋式要多压一拍。"),
        /** 收招：7 − 速度偏移[−1,2] ×0.02；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(4, 12).round(0),
            "收招", "收势站稳的时间；速度越快越短。"),
        /** 冷却：26 − 等级偏移[0,5] ×0.15 + 广旋 +6；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(28).times(0.15).clamp(0, 5))
                .plus(F.when(F.pref("wide", text(darkestlariatMoveText)), F.const(6), F.const(0)))
                .clamp(18, 40).round(0),
            "冷却", "两次横扫之间等多久；等级越高回得越快，广旋式更费。")
    });

    stages(darkestlariatId, [
        { level: 36, values: { sweep: 74 } },
        { level: 52, values: { sweep: 84, radius: 3.0 } }
    ]);

    defineDamage(darkestlariatId, "sweep", {}, { contact: true });

    describe(darkestlariatId, [
        { key: "description.0", values: ["sweep", "radius"] },
        { key: "description.1", values: ["depth", "push", "spin", "gales"] },
        { key: "wide.on", values: ["radius", "push", "sweep"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: ["radius", "push", "sweep"], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sweep", "tier.1.radius"] }
    ]);
}
