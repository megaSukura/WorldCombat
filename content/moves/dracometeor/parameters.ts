/**
 * 流星群 / dracometeor 的参数与伤害段。本族「力竭奥义」里以**从头顶砸下的陨石群**成形的一记。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Dragon／特殊／威力 130／命中 90／PP 5／优先度 0／非接触；
 *   self boosts { spa: -2 }，无次要效果；target normal（单体）。已实装学习者 57 位。
 *   描述「从天空中向对手落下陨石。使用之后因为反作用力，自己的特攻会大幅降低」。
 *
 * 翻译：把「从天上落下陨石打一下、代价是特攻大掉」翻成即时战斗里**从高空砸下一群陨石**——落点先亮起，
 *   陨石一颗颗垂直砸下，每颗在自己落点炸开一圈龙属性能量、把地面砸出坑。反作用力就是特攻掉 2 级，
 *   提交那一刻就付：召唤与维系陨石耗的是同一份精神力。流星式把一记分成几颗散布，坠星式只一颗直落。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、过热是身前一张扇形热浪、精神突进是隔空内爆；
 *   流星群是唯一**从正上方垂直砸下、落点散布成一片**的那一记，也是唯一把伤害分给多颗陨石的。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   meteor       单颗威力：特攻给重、等级拾级；流星式分薄。
 *   count        陨石数：特攻与等级决定流星式召几颗。
 *   spread       散布半径：体型（宽）决定流星式铺多开。
 *   impactRadius 每颗落点半径：特攻决定炸开多大。
 *   fall         召唤高度：等级决定从多高落。
 *   velocity     下落速度：速度决定砸得多快。
 *   interval     陨石间隔：速度决定一颗接一颗的节奏。
 *   reach        射程：特攻给召唤的距离。
 *   crater       坑半径：特攻决定砸出多大。
 *   craterTicks  坑时长：等级与特攻决定留多久。
 *   shards       碎片数：特攻派生，驱动画面。
 *   insightLoss  自身特攻下降级：原生固定 2 级。
 *   tempo/aftercast/recharge：速度定节奏，流星式更慢更长。
 *
 * 配置 `barrage`（流星式，默认关）双向取舍：
 *   开＝召 count 颗陨石散布在目标周围逐个砸下，每颗单发威力 ×0.8，总伤害更高但摊在多个落点、起手更慢
 *   （+5 刻）、冷却更长（+8 刻）；关（坠星式）＝一颗大陨石直落目标，单点更重、出手更快，但只打一个点。
 *   人群里流星式的覆盖更好，单挑时坠星式更稳，各有适用局面。
 *
 * 伤害段 `meteor` 与参数同名，走共享换算（原始类别 Special）；对手特防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("dracometeor", {
        /** 单颗威力：基础 128；特攻每比 60 多 1 加 0.9（夹 −26..56）；等级每比 20 高 1 加 0.3（夹 0..18）；
         *  流星 ×0.8 / 坠星 ×1.0；夹 90..214。 */
        meteor: formula(
            F.base(128)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-26, 56))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("barrage", text("worldcombat.skill.dracometeor.preference.barrage")), F.const(0.8), F.const(1.0)))
                .clamp(90, 214).round(1),
            "陨石威力", {
                unit: "威力",
                description: "每颗陨石砸中那一下的力；特攻越高越沉、等级越高越足。流星式把力分给多颗，单颗轻一点。对手特防、相性与暴击在命中时另算。"
            }),
        /** 陨石数：流星式 = 2 + 特攻偏移[0,2] + 等级偏移[0,1.4] / 坠星式 = 1；夹 2..5。 */
        count: formula(
            F.when(F.pref("barrage", text("worldcombat.skill.dracometeor.preference.barrage")),
                F.base(2)
                    .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2))
                    .plus(F.level().minus(20).times(0.02).clamp(0, 1.4))
                    .clamp(2, 5).round(0), F.const(1)),
            "陨石数", {
                unit: "颗",
                description: "流星式一次召下几颗陨石；特攻与等级越高越多。画面里的落星数量按它派生。坠星式固定 1 颗。"
            }),
        /** 散布半径：流星式 = 1.8 + 宽偏移[−0.5,1.5] / 坠星式 = 0；夹 1.2..3.6。 */
        spread: formula(
            F.when(F.pref("barrage", text("worldcombat.skill.dracometeor.preference.barrage")),
                F.base(1.8).plus(F.body("width").minus(0.9).times(1.2).clamp(-0.5, 1.5)).clamp(1.2, 3.6).round(2),
                F.const(0)),
            "散布半径", {
                unit: "格",
                description: "流星式的落点围绕目标铺多开；体型越宽的个体召得更散。画面里那片落点圈就是这个半径。只有流星式有。"
            }),
        /** 落点半径：基础 1.3 格；特攻每比 60 多 1 加 0.008（夹 0..0.8）；夹 1.0..2.2。 */
        impactRadius: formula(
            F.base(1.3).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 0.8)).clamp(1.0, 2.2).round(2),
            "落点半径", {
                unit: "格",
                description: "每颗陨石砸中后炸开多大一圈；特攻越高炸得越开。画面里的冲击圈就是这个半径。"
            }),
        /** 召唤高度：基础 20 格；等级每比 20 高 1 加 0.15（夹 0..6）；夹 16..28。 */
        fall: formula(
            F.base(20).plus(F.level().minus(20).times(0.15).clamp(0, 6)).clamp(16, 28).round(1),
            "召唤高度", {
                unit: "格",
                description: "陨石从多高砸下来；等级越高召得越高。它决定画面里那条下坠尾迹的长度与目标的反应时间。"
            }),
        /** 下落速度：基础 1.35 格/刻；速度每比 55 快 1 加 0.008（夹 −0.2..0.5）；夹 1.0..1.9。 */
        velocity: formula(
            F.base(1.35).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.5)).clamp(1.0, 1.9).round(2),
            "下落速度", {
                unit: "格/刻",
                description: "陨石下坠的速度；速度快的个体砸得更急，目标更来不及走出落点。"
            }),
        /** 陨石间隔：基础 6 刻；速度每比 55 快 1 减 0.03（夹 −0.6..2）；夹 3..10。 */
        interval: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-0.6, 2)).clamp(3, 10).round(0),
            "陨石间隔", "流星式里一颗接一颗之间隔多久；速度快的个体连得更密。"),
        /** 射程：基础 13 格；特攻每比 60 多 1 加 0.04（夹 −1.5..3）；夹 10..17。 */
        reach: formula(
            F.base(13).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3)).clamp(10, 17).round(1),
            "射程", {
                unit: "格",
                description: "能从多远召下陨石；特攻高召得远。它也是本招的实际射程与指示范围。"
            }),
        /** 坑半径：基础 1.0 格；特攻每比 60 多 1 加 0.005（夹 0..0.6）；夹 0.8..1.8。 */
        crater: formula(
            F.base(1.0).plus(F.stat("specialAttack").minus(60).times(0.005).clamp(0, 0.6)).clamp(0.8, 1.8).round(2),
            "坑半径", {
                unit: "格",
                description: "陨石砸出的焦黑坑有多大；特攻越高砸得越开。画面里那块坑地就是这个半径。"
            }),
        /** 坑时长：基础 90 刻；等级每比 20 高 1 加 0.8（夹 0..50）；夹 70..180。 */
        craterTicks: seconds(
            F.base(90).plus(F.level().minus(20).times(0.8).clamp(0, 50)).clamp(70, 180).round(0),
            "坑时长", "陨石坑留多久；等级越高留得越久。到时原方块回来。"),
        /** 碎片数：基础 24；特攻每比 60 多 1 加 0.16；夹 16..52。 */
        shards: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.16)).clamp(16, 52).round(0),
            "碎片数", {
                unit: "片",
                description: "陨石炸开时迸出的碎星与碎石数量，也驱动画面的密度；特攻越高越密。"
            }),
        /** 自身特攻下降级：原生固定 2 级；夹 2..6。 */
        insightLoss: formula(
            F.const(2).clamp(2, 6).round(0),
            "自身特攻下降", {
                unit: "级",
                description: "召下陨石后自身特攻下降的能力等级；原生固定 2 级，提交那一刻就付，中与不中都一样。"
            }),
        /** 起手：基础 14 刻；速度每比 55 快 1 减 0.05（夹 −2..3.5）；流星 +5；夹 9..22。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 3.5))
                .plus(F.when(F.pref("barrage", text("worldcombat.skill.dracometeor.preference.barrage")), F.const(5), F.const(0)))
                .clamp(9, 22).round(0),
            "起手", "抬头向天召唤陨石的时间；速度越快越短，流星式要多召一会儿。"),
        /** 收招：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1..2.5）；夹 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5)).clamp(7, 16).round(0),
            "收招", "召完之后把意识收回来、重新站稳的时间；速度越快越短。"),
        /** 冷却：基础 40 刻；速度每比 55 快 1 减 0.07（夹 −3..6）；流星 +8；夹 26..58。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.07).clamp(-3, 6))
                .plus(F.when(F.pref("barrage", text("worldcombat.skill.dracometeor.preference.barrage")), F.const(8), F.const(0)))
                .clamp(26, 58).round(0),
            "冷却", "两次召唤之间等待多久；快的个体回气更快，流星式缓得更久。")
    });

    stages("dracometeor", [
        { level: 30, values: { meteor: 138, shards: 30 } },
        { level: 50, values: { meteor: 156, reach: 15 } }
    ]);

    defineDamage("dracometeor", "meteor", {});

    describe("dracometeor", [
        { key: "description.0", values: ["meteor"] },
        { key: "description.1", values: ["reach", "velocity", "impactRadius", "fall"] },
        { key: "description.2", values: ["crater", "craterTicks"] },
        { key: "description.3", values: ["insightLoss"] },
        { key: "barrage.on", values: ["count", "spread", "interval"], when: function (context) { return read(context.detail.values, ["barrage"]) === true; } },
        { key: "barrage.off", values: [], when: function (context) { return read(context.detail.values, ["barrage"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.meteor"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.meteor", "tier.1.reach"] }
    ]);
}
