/**
 * 骨棒 / boneclub 的参数与伤害段。
 *
 * 原生事实：Ground／物理／威力 65／命中 85／PP 20／不接触／10% 畏缩（Cobblemon 1.8，仅 3 位学习者，属 Past）。
 * 翻译：把“用手中的骨头殴打对手”落成一记**抡起骨头当棍子的横扫**——骨头比身体够得远，沿瞄准方向扫出一条窄长走廊，
 * 扫中的目标吃一记不接触的重击；命中只有 85，抡偏是常事（用共享的命中偏角把瞄偏画出来）。它是畏缩家族里
 * 唯一用**武器够到更远**的一式，也是唯一会真的抡空的一式。
 *
 * 与同族分开：暗影之骨把骨头**掷出去**、碎岩/铁尾/撕裂爪是贴身连点；**只有骨棒把骨头握在手里、够得更远**，
 * 玩家凭“对手还没贴上来就挨了一下”把它认出来。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   club    挥击威力 65 + 物攻偏移 + 体重偏移（全身压在棍上）；横扫 ×0.86、直刺 ×1.14。
 *   reach   够到的长度 3.0 + 身高偏移（臂长/棍长）+ 速度偏移；横扫 ×1.05、直刺 ×0.95。
 *   gauge   走廊半宽 0.5 + 体宽偏移；横扫 ×1.7、直刺 ×0.8（越窄越难抡中，正是直刺更高的代价）。
 *   step    挥击前踏近的一小步 0.6 + 速度偏移。
 *   staggerChance 敲懵几率 0.10（原生）+ 物攻偏移；横扫 ×0.9。
 *   staggerTicks  敲懵持续 10 刻；横扫 −2、直刺 +2。
 *   scuffTicks    抡空磕在地上的土痕停留时间。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `sweep`（横扫式）双向取舍：开启＝走廊更宽、能一次扫到几个人，但每人更轻、收招更慢；
 * 关闭＝直刺，走廊窄而单发更高、出手更快，但 85 的命中偏角下更可能抡空。两个方向各有适用局面。
 *
 * 伤害段 `club` 与参数同名，走共享换算（原生类别 Physical，Ground 属性）；不接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("boneclub", {
        /** 挥击威力：攻击每比 50 多 1 加 0.30（上限 +30），体重每比 50 多 1 加 0.05（上限 +12）；
         *  基础 65；横扫 ×0.86 / 直刺 ×1.14；夹在 34..150。 */
        club: formula(
            F.base(65).plus(F.stat("attack").minus(50).times(0.30).clamp(-12, 30))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-3, 12))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(0.86), F.const(1.14)))
                .clamp(34, 150).round(1),
            "挥击威力", {
                unit: "威力",
                description: "骨头抡中时这一下的基础威力；物攻给出挥击的力、体重把全身压进棍里。横扫式每人更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 够到长度：基础 3.0 格，身高每比 1.4 高 1 格加 0.28（上限 +1.0），速度每比 55 快 1 加 0.008（上限 +0.5）；
         *  横扫 ×1.05 / 直刺 ×0.95；夹在 2.2..4.6。 */
        reach: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.28).clamp(-0.4, 1.0))
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(1.05), F.const(0.95)))
                .clamp(2.2, 4.6).round(2),
            "够到长度", {
                unit: "格",
                description: "骨头加上前伸的身体能够到的长度，也是本招的实际射程来源；个子越高、手臂越长够得越远。"
            }),
        /** 走廊半宽：基础 0.5 格，体宽每比 0.9 宽 1 格加 0.18（上限 +0.2）；横扫 ×1.7 / 直刺 ×0.8；夹在 0.3..1.4。 */
        gauge: formula(
            F.base(0.5).plus(F.actor("width").minus(0.9).times(0.18).clamp(-0.1, 0.2))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(1.7), F.const(0.8)))
                .clamp(0.3, 1.4).round(2),
            "走廊半宽", {
                unit: "格",
                description: "骨头扫过的横向宽度；横扫式最宽，一次能兜住几个人，直刺窄得只认准一条线——窄了威力高，却更容易抡偏。"
            }),
        /** 前踏小步：基础 0.6 格，速度每比 55 快 1 加 0.006（上限 +0.25）；横扫 ×0.9 / 直刺 ×1.1；夹在 0.3..1.0。 */
        step: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.25))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(0.9), F.const(1.1)))
                .clamp(0.3, 1.0).round(2),
            "前踏小步", {
                unit: "格",
                description: "挥棍前朝目标踏近的一小步；直刺式踏得更实，横扫式守着原位转腰。"
            }),
        /** 敲懵几率：基础 0.10（原生），物攻每比 50 多 1 加 0.0008（上限 +0.06）；横扫 ×0.9；夹在 0.06..0.24。 */
        staggerChance: percent(
            F.base(0.10).plus(F.stat("attack").minus(50).times(0.0008).clamp(-0.03, 0.06))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(0.9), F.const(1))).clamp(0.06, 0.24),
            "敲懵几率", "被骨头敲中时的畏缩几率（原生 10%，本组最低）；物攻越高越容易把人敲懵。"),
        /** 敲懵持续：基础 10 刻，横扫式 −2、直刺式 +2；夹在 8..18 刻。 */
        staggerTicks: seconds(
            F.base(10).plus(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(-2), F.const(2))).clamp(8, 18).round(0),
            "敲懵持续", "被敲懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 土痕停留：基础 70 刻，体重每比 50 多 1 加 0.3（上限 +40，下限 −15）；夹在 40..150。 */
        scuffTicks: seconds(
            F.base(70).plus(F.body("weight").minus(50).times(0.3).clamp(-15, 40)).clamp(40, 150).round(0),
            "土痕停留", "抡空磕在地上留下的土痕停留多久后原方块回来；越重磕得越深、留得越久。"),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.015（下限 −2）；横扫 +3；夹在 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 2))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "举棍、转腰到挥出去的时间；速度越快越短，横扫式要抡得更开。"),
        /** 收招：基础 9 刻，速度每比 55 快 1 减 0.015（下限 −2）；横扫 +3；夹在 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 2))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "收招", "挥完把棍收回来、稳住重心的收势；横扫式收得更慢。"),
        /** 冷却：基础 22 刻，速度每比 55 快 1 减 0.04（下限 −4）；横扫 +6；夹在 12..36。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 4))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.boneclub.preference.sweep")), F.const(6), F.const(0)))
                .clamp(12, 36).round(0),
            "冷却", "两次挥击之间的等待；武器够得远，代价是回得比空手慢。"),
        maxTargets: hidden(3)
    });

    stages("boneclub", [
        { level: 20, values: { club: 62 } },
        { level: 38, values: { club: 76, reach: 3.6, staggerChance: 0.16 } }
    ]);

    defineDamage("boneclub", "club", { defenceCoefficient: 0.006,
        rationale: "骨头抡击不接触；防御按默认系数减伤，命中偏角由共享命中能力等级与 85 的基础命中决定。" });

    describe("boneclub", [
        { key: "description.0", values: ["club", "reach", "gauge"] },
        { key: "description.1", values: ["step"] },
        { key: "description.2", values: ["staggerChance", "staggerTicks"] },
        { key: "sweep.on", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.club"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.club", "tier.1.reach", "tier.1.staggerChance"] }
    ]);
}
