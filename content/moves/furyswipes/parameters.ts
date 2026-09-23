/**
 * 乱抓 / furyswipes —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**一般**／物理／威力 18／命中 80／PP 15／接触（`contact: 1`）／单体／连续 2～5 次
 *   （`multihit: [2, 5]`）。描述「用爪子或镰刀等抓对手进行攻击，连续攻击2～5次」，约 100 位学习者，是本组最普及的一招。
 *
 * 翻译：把「用爪子连续抓」落成一趟**贴身游走乱抓**——施法者绕着对手的左右两侧连续换位，每一次换位就从新的角度
 *   落下几道爪痕，抓空一次这趟就散。它是本族唯一**会自己走动**的连击：不是站定打，而是边换位边抓，被它缠上的
 *   目标必须一直转身，否则下一道从背后落下。
 *   与同族分开：乱击是站定用角喙定点突刺、扫尾拍打是原地整圈旋尾、骨棒乱打是掷骨夯地；只有乱抓把位移做进连击里。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   rake      每道爪击威力：物攻定爪有多利；扑抓式略重、游走式略轻。
 *   cuts      爪数：速度定换位多快、物攻定收爪多紧、等级定耐力，共同决定这一趟最多几道。
 *   reach     爪距：身高定手臂与爪长；扑抓式前扑更远、游走式收得近些。
 *   span      抓过张角：身宽定爪子抡开多大一片面；游走式罩得更宽、扑抓式收窄成一道。
 *   step      每道之间的换位距离：速度与身宽决定侧移多快；扑抓式几乎不侧移、改为前压。
 *   gap       两道之间间隔：速度决定换位与出爪的密度。
 *   accuracy  每道命中率：速度提高它（原生 80% 起）；游走式稍高、扑抓式稍低。
 *   dust      扬尘数量：物攻换算的爪风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度与等级定起手、收招与冷却。
 *
 * 配置 `pounce`（扑抓式）双向取舍（默认关，即游走式）：
 *   开（扑抓）＝每道威力 ×1.08、爪距 ×1.12，代价是张角 ×0.8（收窄成一道）、换位 ×0.45、命中率 −3%、间隔 +1 刻。
 *     适用：把目标按在一个方向猛抓，单点更狠。
 *   关（游走）＝张角 ×1.12、换位 ×1.25、命中率 +3%，代价是每道 ×0.9、爪距 ×0.92。
 *     适用：贴身绕圈，逼目标不停转身，也更容易抓到侧后。
 *
 * 伤害段 `rake` 与参数同名：每道各自结算一次接触伤害（共享换算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const furyswipesId = "furyswipes";
    export const furyswipesScene = "world_combat:move_furyswipes";
    export const furyswipesMissText = "world_combat.move.furyswipes.text.miss";
    export const furyswipesTallyText = "world_combat.move.furyswipes.text.tally";

    actionParameters.define(furyswipesId, {
        /** 每道威力：18 + 物攻偏移[−4,10]×0.12；扑抓 ×1.08 / 游走 ×0.9；夹 10..34。 */
        rake: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 10))
                .times(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(1.08), F.const(0.9)))
                .clamp(10, 34).round(1),
            "每道威力", { base: 18,
                unit: "威力",
                description: "每一道爪痕各自结算的威力；物攻越高爪子越利。扑抓式更重，游走式更轻。对手物防、相性与暴击在每道命中时另算。"
            }),
        /** 爪数：2 + 速度偏移[0,1.8] + 物攻偏移[0,1.0] + 等级(≥25)偏移[0,1]；向下取整；夹 2..5。 */
        cuts: formula(
            F.base(2)
                .plus(F.stat("speed").minus(55).times(0.018).clamp(0, 1.8))
                .plus(F.stat("attack").minus(55).times(0.012).clamp(0, 1.0))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor().clamp(2, 5),
            "爪数", {
                unit: "道",
                description: "这一趟最多落下几道爪痕（原生 2～5）；速度定换位的快慢、物攻定收爪的密度、等级定耐力。抓空一道这趟就散。"
            }),
        /** 爪距：2.4 + 身高偏移[−0.2,0.8] + 速度偏移[−0.15,0.4]；扑抓 ×1.12 / 游走 ×0.92；夹 1.8..3.4。 */
        reach: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.6).clamp(-0.2, 0.8))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.15, 0.4))
                .times(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(1.12), F.const(0.92)))
                .clamp(1.8, 3.4).round(2),
            "爪距", { base: 2.4,
                unit: "格",
                description: "爪子从新位置能够到多远；身高与出手速度越高够得越远，也是本招的实际射程来源。扑抓式扑得更远。"
            }),
        /** 抓过张角：130 + 身宽偏移[−10,50]；扑抓 ×0.8 / 游走 ×1.12；夹 70..200。 */
        span: formula(
            F.base(130).plus(F.body("width").minus(0.9).times(40).clamp(-10, 50))
                .times(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(0.8), F.const(1.12)))
                .clamp(70, 200).round(0),
            "抓过张角", {
                unit: "度",
                description: "一道爪痕在身前扫过多大一片；身宽的个体甩得更开。游走式罩得宽、扑抓式收成一道窄面。画面里的扇形就是判定范围。"
            }),
        /** 换位距离：0.55 + 速度偏移[−0.12,0.45] + 身宽偏移[−0.06,0.25]；扑抓 ×0.45 / 游走 ×1.25；夹 0.2..1.3。 */
        step: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.45))
                .plus(F.body("width").minus(0.9).times(0.15).clamp(-0.06, 0.25))
                .times(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(0.45), F.const(1.25)))
                .clamp(0.2, 1.3).round(2),
            "换位距离", { base: 0.55,
                unit: "格",
                description: "每一道之后绕目标侧移多远；速度与身宽决定步子多大。游走式绕得远、扑抓式改为向前压。"
            }),
        /** 间隔：4 − 速度偏移[−0.8,1.2]；游走 −1 / 扑抓 +1；夹 2..6。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(1), F.const(-1)))
                .clamp(2, 6).round(0),
            "间隔", "两道爪痕之间隔多久；速度越快换位与出爪越密，游走式更急、扑抓式略缓。"),
        /** 每道命中率：0.8 + 速度偏移[−0.03,0.06]；游走 +0.03 / 扑抓 −0.03；夹 0.7..0.97。 */
        accuracy: percent(
            F.base(0.8).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.06))
                .plus(F.when(F.pref("pounce", text("worldcombat.skill.furyswipes.preference.pounce")), F.const(-0.03), F.const(0.03)))
                .clamp(0.7, 0.97).round(3),
            "每道命中率", "每一道爪痕独立掷的命中率（原生 80% 起）；速度提高它，游走式在换位中更从容、扑抓式更冒险。落空一道这趟就散。"),
        /** 扬尘数量：14 + 物攻偏移[−3,14]；夹 10..34。 */
        dust: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 14)).clamp(10, 34).round(0),
            "扬尘数量", {
                unit: "点",
                description: "每一道带起的爪风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−0.8,1.5]；夹 3..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5)).clamp(3, 9).round(0),
            "起手", "压低身位、亮出爪子到第一道落下的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−0.6,1.3]；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.3)).clamp(3, 9).round(0),
            "收招", "爪势收住、落回站姿的时间；速度越快收得越快。"),
        /** 冷却：22 − 速度偏移[−3,4]；夹 13..32。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4)).clamp(13, 32).round(0),
            "冷却", "再起一趟乱抓前等待多久；速度越快回得越快。")
    });

    defineDamage(furyswipesId, "rake", {}, { contact: true });

    stages(furyswipesId, [
        { level: 24, values: { rake: 22 } },
        { level: 40, values: { rake: 27, reach: 2.9 } },
        { level: 56, values: { rake: 31, step: 0.8 } }
    ]);

    describe(furyswipesId, [
        { key: "description.0", values: ["rake","cuts","accuracy"] },
        { key: "description.1", values: ["reach","span","step","gap"] },
        { key: "pounce.on", values: [], when: function (context) { return read(context.detail.values, ["pounce"]) === true; } },
        { key: "pounce.off", values: [], when: function (context) { return read(context.detail.values, ["pounce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rake"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rake", "tier.1.reach"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.rake", "tier.2.step"] }
    ]);
}
