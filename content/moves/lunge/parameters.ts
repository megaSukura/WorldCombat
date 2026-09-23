/**
 * 猛扑 / lunge —— 参数与伤害段。本组「卸力一击」的重击成员。
 *
 * 原生事实：Bug／物理／威力 80／命中 100／PP 15／接触／单体；命中后 100% 使目标攻击下降 1 级
 *   （secondary.boosts.atk -1）。描述「全力猛扑对手进行攻击。从而降低对手的攻击。」（Cobblemon 1.8）。
 *
 * 翻译：把「全力猛扑」落成**把整个身体抛出去的一记跳扑**——后腿蓄力、贴着地面向前扑进，把全部体重压在这一撞上；
 *   撞实之后对手被撞得后仰、一时间挥不动手，攻击下降。它是本组单体最重的一记，也是唯一会把自己整个人送出去的一招：
 *   出手即承诺方向，扑空就停在落点。同族凭「向前扑进的重击 vs 原地扫一圈 / 隔空放怨念 / 火热的踢」分开。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距才在场上看得出来）：
 *   pounce  扑撞威力：**物攻**给这一撞的狠度，等级给老练；全力式 ×1.18 / 轻快式 ×0.92。
 *   reach   扑进距离：**速度**给起步，**身高**给步幅；全力式 ×1.12。它就是本招的实际射程。
 *   leap    扑进速度：速度派生，快的人扑得更急。
 *   radius  判定半径：**身高与体宽**决定身子多粗。
 *   push    撞开距离：**物攻**与**体重**派生（沉的人撞得动），全力式 ×1.35。
 *   chitin  甲壳碎屑数：物攻与速度派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；全力式更慢更费。
 *
 * 配置 `heavy`（全力式，默认关）双向取舍：开＝威力 ×1.18、顶开 ×1.35、扑进 ×1.12，代价是起手 +3、收招 +3、
 *   冷却 +8 刻；关（轻快式）＝威力 ×0.92、出手与冷却更快。硬目标上该开，追灵活目标时该关。
 *
 * 伤害段 `pounce` 与参数同名，标 contact（原生接触）。
 */
namespace PokemonSkills {
    actionParameters.define("lunge", {
        /** 扑撞威力：基础 70；物攻每比 60 多 1 加 0.34（夹 −14..40）；等级每比 30 高 1 加 0.35（夹 −4..12）；
         *  全力 ×1.18 / 轻快 ×0.92；夹 48..150。 */
        pounce: formula(
            F.base(70)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-14, 40))
                .plus(F.level().minus(30).times(0.35).clamp(-4, 12))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(1.18), F.const(0.92)))
                .clamp(48, 150).round(1),
            "扑撞威力", {
                unit: "威力",
                description: "跳扑撞实那一下的基础威力；物攻越高撞得越狠，等级越高发力越整。全力式把整个人压上去更重，轻快式收着打。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑进距离：基础 2.8；速度每比 60 快 1 加 0.012（夹 −0.25..0.85）；身高每比 1.4 高 1 加 0.3（夹 −0.12..0.5）；
         *  全力 ×1.12；夹 2.0..5.2。 */
        reach: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(60).times(0.012).clamp(-0.25, 0.85))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.12, 0.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(1.12), F.const(1)))
                .clamp(2.0, 5.2).round(2),
            "扑进距离", {
                unit: "格",
                description: "这一记跳扑最多能推进多远；速度给起步、身高给步幅，全力式压得更远。它也是本招的实际射程。"
            }),
        /** 扑进速度：基础 0.62 + 速度每比 60 快 1 加 0.004（夹 −0.08..0.22）；全力 ×1.08；夹 0.45..1.05。 */
        leap: formula(
            F.base(0.62)
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.22))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(1.08), F.const(1)))
                .clamp(0.45, 1.05).round(2),
            "扑进速度", {
                unit: "格/刻",
                description: "跳扑每一刻推进的距离；速度越快扑得越急，目标越难走位躲开。"
            }),
        /** 判定半径：基础 0.5 + 身高偏移[−0.05,0.18] + 体宽偏移[−0.05,0.2]；夹 0.42..0.85。 */
        radius: formula(
            F.base(0.5)
                .plus(F.body("height").minus(1.4).times(0.09).clamp(-0.05, 0.18))
                .plus(F.body("width").minus(0.9).times(0.2).clamp(-0.05, 0.2))
                .clamp(0.42, 0.85).round(2),
            "判定半径", {
                unit: "格",
                description: "扑进途中撞到东西的判定粗细；体型越高越宽的身子碰得越广。"
            }),
        /** 撞开距离：基础 0.7 + 物攻偏移[−0.1,0.7] + 体重偏移[−0.1,0.5]；全力 ×1.35；夹 0.25..2.0。 */
        push: formula(
            F.base(0.7)
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.7))
                .plus(F.body("weight").minus(300).times(0.0004).clamp(-0.1, 0.5))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(1.35), F.const(1)))
                .clamp(0.25, 2.0).round(2),
            "撞开距离", {
                unit: "格",
                description: "被撞到的人沿扑进方向被顶开多远；物攻越高、自己越沉撞得越动，全力式顶得更开。"
            }),
        /** 掉攻级数：原生固定 1 级，是这招的身份。 */
        stages: formula(
            F.const(1).clamp(1, 2).round(0),
            "掉攻级数", {
                unit: "级",
                description: "命中后目标攻击下降的能力等级；对宝可梦落到原生攻击等级，对其他战斗者落到攻击属性。原生固定 1 级。"
            }),
        /** 甲壳碎屑数：基础 14 + 物攻偏移[−3,16] + 速度偏移[−2,10]；夹 10..40。 */
        chitin: formula(
            F.base(14)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-3, 16))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-2, 10))
                .clamp(10, 40).round(0),
            "甲壳碎屑数", {
                unit: "点",
                description: "跳扑带起的甲壳碎屑数量，随物攻与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 − 速度偏移[−2.5,3]；全力 +3；夹 4..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.04).clamp(-2.5, 3))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "后腿蓄力、把身子压下去的时间；速度越快越短，全力式多沉一拍。"),
        /** 收招：基础 7 − 速度偏移[−1.5,2.5]；全力 +3；夹 4..14。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "收招", "扑完把身子收住、重新站稳的时间；速度越快收得越利落，全力式落点更重。"),
        /** 冷却：基础 24 − 等级偏移[−3,6]；全力 +8；夹 14..42。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(20).times(0.15).clamp(-3, 6))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.lunge.preference.heavy")), F.const(8), F.const(0)))
                .clamp(14, 42).round(0),
            "冷却", "两次猛扑之间的等待；等级越高回气越快，全力式更费。PP 15 的代价。")
    });

    defineDamage("lunge", "pounce", {}, { contact: true });

    stages("lunge", [
        { level: 36, values: { pounce: 84 } },
        { level: 52, values: { pounce: 96, chitin: 30 } }
    ]);

    describe("lunge", [
        { key: "description.0", values: ["pounce"] },
        { key: "description.1", values: ["reach", "leap", "radius"] },
        { key: "description.2", values: ["push", "stages"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pounce"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pounce"] }
    ]);
}
