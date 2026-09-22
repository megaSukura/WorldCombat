/**
 * 芳香薄雾 / aromaticmist 的参数与数值来源。
 *
 * 原生事实：Fairy、变化、威力 —、命中必中、PP 20、优先度 0、目标 adjacentAlly（相邻友方），boosts { spd: +1 }。
 *
 * 核心念头：施法者身上腾起一层带甜香的薄雾，雾不散，就地漫开成一片会停留的香云；走进雾里的伙伴被香气裹住、
 *   特防提起来，离雾之后香还挂在身上一小会儿。它把一次特防强化留在**世界上一个位置**，而不是只贴一个人。
 * 世界化：落点用 WorldEffects.field 租借一片香云（规则 world_combat:field/aromaticmist 定义在本单元）。
 *   云每 5 刻扫一次，对雾里的友方按共享身份 world_combat:status/aromaticmist 挂一份真实 MobEffect
 *   （本单元效果 world_combat:aromatic_veil），特防立刻写入公共能力阶梯；留在雾里香气不断续上，
 *   离雾后香随留香窗口自行走完，窗口结束或被清除时按各自实际抬到的级数原样收回。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift        特防等级：基础 1，基础特防 ≥ 90 再 +1；夹 1..2。天生厚的个体把这一档推得更高。
 *   cloudRadius 香雾半径：基础 2.8 格 + 身高×0.6 + 特防×0.004；夹 2.0..5.5。身板大、特防高摊得越开。
 *   cloudTicks  香雾时长：基础 140 刻 + 特防×0.5 + 等级×1.2；夹 120..360。这片云在世界上停留多久。
 *   veilTicks   留香时长：基础 100 刻 + 亲密度×0.5；夹 60..240。离开香雾后香还挂在身上多久。
 *   motes       香点数量：基础 20 + 特防×0.12；夹 16..48。驱动画面密度。
 *   reach       送香距离：基础 5 格 + 身高×0.3；夹 4..8。能把香雾送到多远。
 *   tempo       起手：基础 9 刻 − 速度×0.02；夹 5..11。
 *   aftercast   收招：基础 6 刻 + 身高×1.2；夹 5..10。
 *   wait        冷却：基础 100 刻 − 等级×0.4；夹 55..130。PP 20 的代价。
 * 配置 bouquet（香势）双向取舍：浓香＝留香 ×1.3，但半径 ×0.8（罩得紧、香得久）；
 *   弥香＝半径 ×1.25，但留香 ×0.75（铺得开、留得短）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("aromaticmist", {
        /** 特防等级：天生厚的个体再推一档。 */
        gift: formula(
            F.base(1).plus(F.when(F.stat("specialDefence").gte(90), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "特防等级", {
                unit: " 级",
                description: "香雾把雾里友方的特防抬高多少级；基础特防 ≥ 90 的个体多推一档。"
            }),
        /** 香雾半径：身板与特防决定摊多开。 */
        cloudRadius: formula(
            F.base(2.8).plus(F.body("height").times(0.6)).plus(F.stat("specialDefence").times(0.004))
                .times(F.when(F.pref("bouquet", text("worldcombat.skill.aromaticmist.preference.bouquet")), F.const(0.8), F.const(1.25)))
                .clamp(2.0, 6.5).round(2),
            "香雾半径", {
                unit: " 格",
                description: "香云在地面上的覆盖半径，也是判定与画面的同一块区域；身板与特防越高摊得越开，弥香再 ×1.25。"
            }),
        /** 香雾时长：这片云在世界上停留多久。 */
        cloudTicks: seconds(
            F.base(140).plus(F.stat("specialDefence").times(0.5)).plus(F.level().times(1.2)).clamp(120, 360).round(0),
            "香雾时长", "一片香云在世界上停留多久；特防与等级让它留得更久。"),
        /** 留香时长：离雾后香还挂多久。 */
        veilTicks: seconds(
            F.base(100).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("bouquet", text("worldcombat.skill.aromaticmist.preference.bouquet")), F.const(1.3), F.const(0.75)))
                .clamp(60, 260).round(0),
            "留香时长", "离开香雾后香还挂在身上多久；亲密度延长它，浓香 ×1.3、弥香 ×0.75。"),
        /** 香点数量：驱动画面密度。 */
        motes: formula(
            F.base(20).plus(F.stat("specialDefence").times(0.12)).clamp(16, 48).round(0),
            "香点数量", {
                unit: " 点",
                description: "香云里浮起的香点数量；特防越高越密，粒子按它发射。"
            }),
        /** 送香距离：身高决定送得多远。 */
        reach: formula(
            F.base(5).plus(F.body("height").times(0.3)).clamp(4, 8).round(2),
            "送香距离", {
                unit: " 格",
                description: "能把香雾送到多远的点；碰撞箱越高送得越远。"
            }),
        /** 起手：速度决定起雾多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.02)).clamp(5, 11).round(0),
            "起手", "腾起香雾需要多久；速度越快越短。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.2)).clamp(5, 10).round(0),
            "收招", "送香之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(100).minus(F.level().times(0.4)).clamp(55, 130).round(0),
            "冷却", "两次送香之间的等待；等级越高越短。PP 20 的代价。")
    });

    describe("aromaticmist", [
        { key: "description.0", values: ["gift", "veilTicks"] },
        { key: "description.1", values: ["cloudRadius", "cloudTicks", "motes"] },
        { key: "description.2", values: ["reach", "tempo", "aftercast", "wait"] },
        { key: "bouquet.rich", values: [], when: function (context) { return read(context.detail.values, ["bouquet"]) === 1; } },
        { key: "bouquet.wide", values: [], when: function (context) { return read(context.detail.values, ["bouquet"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
