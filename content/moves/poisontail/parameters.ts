/**
 * 毒尾 / poisontail 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／物理／威力 50／命中 100／PP 25／接触／critRatio 2／10% 使目标中毒；
 *   43 位学习者。原生描述：「用尾巴拍打。有时会让对手陷入中毒状态，也容易击中要害。」
 *
 * 翻译：把「用尾巴拍打」落成一记**贴地抡过半圈的宽扫**——施法者低身转身，尾巴从身后扫到身前再扫向另一侧，
 *   尾梢的毒囊在这条低弧线上一路抹毒。它一次能扫到围上来的好几个人：正对的那个吃满，旁边被带到的吃折扣；
 *   越靠尾梢（越远）毒越容易抹上。它是本族唯一**低位、宽弧、以毒为身份**的扫击，反制方式是退到弧线之外。
 *
 * 与同族分开：水流尾是向前推进的弧形水墙、把人推走并浇灭火；龙尾是正面大扇形把人抽飞逐退；铁尾锁定一点重砸。
 *   毒尾是绕身半圈的低扫，靠尾梢把毒抹到扫过的人身上。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   lash         扫击威力：物攻定劲道，速度把甩尾的势能加进去；毒尾式把每一记摊薄。
 *   reach        扫击半径：速度与身高决定尾长能扫多远；也是本招射程基准。
 *   arc          弧面角度：速度决定甩得有多开；毒尾式收窄一点。
 *   share        副目标折扣：等级决定熟练度，扫得更匀。
 *   poisonChance 中毒概率：特攻（毒液）与物攻（抹得进伤口）派生；毒尾式更高。
 *   venomTicks   中毒时长：特攻与等级派生。
 *   push         扫开距离：体重派生。
 *   drops        毒滴数：物攻派生，表现按它发射。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 * 配置 venom（毒尾式）双向取舍：开启＝中毒概率 ×1.25、时长 ×1.15、毒滴更多，但扫击 ×0.9、弧面收窄；
 * 关闭（扫尾式）＝扫得更宽更重，但毒更难抹上。
 *
 * 伤害段 lash：这一扫随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("poisontail", {
        /** 扫击威力：基础 50，物攻每比 60 多 1 加 0.22（夹 -8..18），速度每比 60 快 1 加 0.12（夹 -4..12）；毒尾 ×0.9；夹 34..92。 */
        lash: formula(
            F.base(50).plus(F.stat("attack").minus(60).times(0.22).clamp(-8, 18))
                .plus(F.stat("speed").minus(60).times(0.12).clamp(-4, 12))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisontail.preference.venom")), F.const(0.9), F.const(1)))
                .clamp(34, 92).round(1),
            "扫击威力", {
                unit: "威力",
                description: "尾巴扫中正对目标的基础威力；物攻定劲道、速度加甩势，毒尾式把每一记摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扫击半径：基础 2.6 格，速度每比 60 快 1 加 0.012（夹 -0.3..0.6），身高每比 1.4 高 1 加 0.2（夹 -0.15..0.5）；夹 2.2..4.2。 */
        reach: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.3, 0.6))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.5))
                .clamp(2.2, 4.2).round(2),
            "扫击半径", {
                unit: "格",
                description: "尾巴从身后扫到身前能覆盖多远；越快、身架越大尾长够得越远。它也是本招的实际射程。"
            }),
        /** 弧面角度：基础 220 度，速度每比 60 快 1 加 0.5（夹 -25..50）；毒尾 ×0.92；夹 150..300。 */
        arc: formula(
            F.base(220).plus(F.stat("speed").minus(60).times(0.5).clamp(-25, 50))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisontail.preference.venom")), F.const(0.92), F.const(1)))
                .clamp(150, 300).round(0),
            "弧面角度", {
                unit: "度",
                description: "尾巴这一扫张开的弧面；越快甩得越开，绕身半圈还多。毒尾式收窄一点、更集中。"
            }),
        /** 副目标折扣：基础 0.55，等级每比 30 高 1 加 0.004（夹 0..0.25）；夹 0.45..0.85。 */
        share: formula(
            F.base(0.55).plus(F.level().minus(30).times(0.004).clamp(0, 0.25)).clamp(0.45, 0.85).round(2),
            "副目标折扣", {
                unit: "比例",
                description: "被弧线顺带扫到的其他人吃到的威力比例；等级越高扫得越匀，正对的目标吃满。"
            }),
        /** 中毒概率：基础 0.10，特攻每比 60 多 1 加 0.0016（夹 -0.04..0.2），物攻每比 60 多 1 加 0.001（夹 -0.03..0.12）；毒尾 ×1.25；夹 0.06..0.5。 */
        poisonChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.2))
                .plus(F.stat("attack").minus(60).times(0.001).clamp(-0.03, 0.12))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisontail.preference.venom")), F.const(1.25), F.const(1)))
                .clamp(0.06, 0.5),
            "中毒概率", "尾梢的毒囊抹进伤口、令目标中毒的概率，越靠扫击外缘越容易抹上；毒尾式更高。"),
        /** 中毒时长：基础 260 刻，特攻每比 60 多 1 加 0.5（夹 -20..60），等级每比 30 高 1 加 2（夹 0..100）；毒尾 ×1.15；夹 180..480。 */
        venomTicks: seconds(
            F.base(260).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-20, 60))
                .plus(F.level().minus(30).times(2).clamp(0, 100))
                .times(F.when(F.pref("venom", text("worldcombat.skill.poisontail.preference.venom")), F.const(1.15), F.const(1)))
                .clamp(180, 480).round(0),
            "中毒时长", "抹上的毒持续多久；特攻越高、等级越高挂得越久，毒尾式更久。"),
        /** 扫开距离：基础 0.35 格，体重每 10 加 0.03（上限 0.4）；夹 0.2..0.9。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").div(10).times(0.03).clamp(0, 0.4)).clamp(0.2, 0.9).round(2),
            "扫开距离", {
                unit: "格",
                description: "被尾梢带到的人沿背离方向被扫开多远；体重越大扫得越开。"
            }),
        /** 毒滴数：基础 12，物攻每比 60 多 1 加 0.12（夹 -4..14）；夹 8..30。 */
        drops: formula(
            F.base(12).plus(F.stat("attack").minus(60).times(0.12).clamp(-4, 14)).clamp(8, 30).round(0),
            "毒滴数", {
                unit: "滴",
                description: "尾梢甩出的毒滴数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.025（夹 -1..2），毒尾 +1；夹 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.025).clamp(-1, 2))
                .plus(F.when(F.pref("venom", text("worldcombat.skill.poisontail.preference.venom")), F.const(1), F.const(0)))
                .clamp(4, 11).round(0),
            "起手", "低身、尾巴盘到身后再甩出的时间；速度越快越短，毒尾式多蓄一拍把毒挤到尾梢。"),
        /** 收招：基础 6 刻，速度每比 60 快 1 减 0.02（夹 -1..1.5）；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(3, 9).round(0),
            "收招", "扫完把尾巴收回架势的时间。"),
        /** 冷却：基础 16 刻，速度每比 60 快 1 减 0.04（夹 -2..3），等级每比 30 高 1 减 0.05（夹 0..3）；夹 9..26。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 3))
                .minus(F.level().minus(30).times(0.05).clamp(0, 3)).clamp(9, 26).round(0),
            "冷却", "两次扫尾之间的等待；速度与等级越高回得越快。")
    });

    defineDamage("poisontail", "lash", {}, { contact: true });

    stages("poisontail", [
        { level: 30, values: { lash: 58 } },
        { level: 48, values: { lash: 66, poisonChance: 0.2 } }
    ]);

    describe("poisontail", [
        { key: "description.0", values: ["lash","reach","arc"] },
        { key: "description.1", values: ["share","push"] },
        { key: "description.2", values: ["poisonChance","venomTicks"] },
        { key: "venom.on", values: [], when: function (context) { return read(context.detail.values, ["venom"]) === true; } },
        { key: "venom.off", values: [], when: function (context) { return read(context.detail.values, ["venom"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.poisonChance"] }
    ]);
}
