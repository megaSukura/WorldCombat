/**
 * 冰息 / frostbreath —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：冰／特殊／威力 60／命中 90／PP 10／单体／willCrit（必定击中要害）／
 *   无次要效果。描述是「将冰冷的气息吹向对手进行攻击。必定会击中要害。」
 *
 * 翻译：把「必定击中要害」落成一片**罩住全身的冷雾**——单点命中可以护住要害，一片漫过来的冷气护不住，
 *   所以每一口都打在薄弱处。它是本组唯一的扇形范围招：冷雾从口中缓慢铺出，罩住的敌人一起按要害结算；
 *   雾到之前看得见，走出雾外就躲开了（这就是原生 90 命中率在即时战斗里的样子）。
 *   落点结出一层霜，被罩住的人冻僵（借共享身份 chill，与冰砾／冰冻拳同一身份，行为由本单元写）。
 *
 * 数据分散（每个参数读不同的精灵数据，落到不同参数上）：
 *   breath       寒气威力：特攻定冷得多深，等级补熟练；广呼把力量摊到更宽的一片上，单点略轻。
 *   reach        呼程（也是射程）：等级与特攻决定雾能铺多远；广呼短一些。
 *   spread       雾弧：等级决定肺活量、特攻决定雾的散度；广呼把弧口撑大。
 *   cloudSpeed   雾速：速度决定冷雾漫出的快慢；广呼更慢（也更好躲）。
 *   radius       雾团半径：体型高度决定雾团多厚；广呼更宽。
 *   frost/frostTicks 结霜格数与停留：特攻决定结多少格，等级决定留多久；广呼更大。
 *   chillTicks   冻僵时长：等级决定雾冷多久；广呼更久。
 *   motes        雾点数量：特攻与等级派生，驱动画面密度。
 *   tempo/aftercast/recharge 速度决定节奏；广呼多吸一口气、冷却更久。
 *
 * 配置 `wide`（广呼）双向取舍：开启＝雾弧 ×1.35、雾团更厚、结霜更多更久、冻僵更久，但呼程 ×0.85、
 *   雾速 ×0.8、威力 ×0.92、起手 +2 刻、冷却 +5 刻（罩一片，慢而轻）。关闭（细呼）＝窄、远、快、重的一道
 *   冷气，代价是覆盖面收窄（点一个人，快而重）。两个方向各有适用局面。
 *
 * 伤害段 `breath`：命中那一下随精灵数据变化的那部分；打的是要害，命中时按共享要害倍率结算。
 */
namespace PokemonSkills {
    export const frostbreathId = "frostbreath";
    export const frostbreathScene = "world_combat:move_frostbreath";
    export const frostbreathChillEffect = "world_combat:frostbreath_chill";
    export const frostbreathChillText = "world_combat.move.frostbreath.text.chill";
    export const frostbreathMissText = "world_combat.move.frostbreath.text.miss";

    actionParameters.define(frostbreathId, {
        /** 寒气威力：50 + 特攻偏移[−10,26] + 等级(≥25)偏移[0,8]，广呼 ×0.92；夹 34..96。 */
        breath: formula(
            F.base(50, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.24).clamp(-10, 26).as("特攻"))
                .plus(F.level().minus(25).times(0.3).clamp(0, 8).as("等级"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(0.92), F.const(1)).as("呼法"))
                .clamp(34, 96).round(1),
            "寒气威力", {
                unit: "威力",
                description: "冷雾罩住一次的基础威力；特攻越高冷得越透，等级让呼出的气更沉。命中必定要害（×1.5）。对手特防、相性在命中时另算。"
            }),
        /** 呼程：8 + 等级(≥25)偏移[0,2] + 特攻偏移[−0.6,1.6]，广呼 ×0.85；夹 6..12。 */
        reach: formula(
            F.base(8, "基础")
                .plus(F.level().minus(25).times(0.06).clamp(0, 2).as("等级"))
                .plus(F.stat("specialAttack").minus(55).times(0.02).clamp(-0.6, 1.6).as("特攻"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(0.85), F.const(1)).as("呼法"))
                .clamp(6, 12).round(2),
            "呼程", {
                unit: "格",
                description: "冷雾能铺到多远；等级高、特攻高的个体呼得更远。它也是本招的实际射程，雾铺不到就没打到。"
            }),
        /** 雾弧：58 + 等级(≥25)偏移[0,22] + 特攻偏移[−6,12]，广呼 ×1.35；夹 40..118。 */
        spread: formula(
            F.base(58, "基础")
                .plus(F.level().minus(25).times(0.8).clamp(0, 22).as("等级"))
                .plus(F.stat("specialAttack").minus(55).times(0.2).clamp(-6, 12).as("特攻"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(1.35), F.const(1)).as("呼法"))
                .clamp(40, 118).round(0),
            "雾弧", {
                unit: "度",
                description: "冷雾铺开的扇形张开多少度；等级高、特攻高的个体罩得更宽。广呼把弧口撑大。"
            }),
        /** 雾速：0.55 + 速度偏移[−0.1,0.2]，广呼 ×0.8；夹 0.3..1.0。 */
        cloudSpeed: formula(
            F.base(0.55, "基础")
                .plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.2).as("速度"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(0.8), F.const(1)).as("呼法"))
                .clamp(0.3, 1.0).round(2),
            "雾速", {
                unit: "格/刻",
                description: "冷雾从口中漫出的速度；速度快呼得更急，对手更来不及走出雾外。广呼更慢。"
            }),
        /** 雾团半径：0.9 + 体型高度偏移[−0.1,0.5]，广呼 ×1.12；夹 0.6..1.9。 */
        radius: formula(
            F.base(0.9, "基础")
                .plus(F.body("height").minus(1.4).times(0.16).clamp(-0.1, 0.5).as("体型"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(1.12), F.const(1)).as("呼法"))
                .clamp(0.6, 1.9).round(2),
            "雾团半径", {
                unit: "格",
                description: "雾团本身的厚度；大个子呼出的雾更厚实。它同时决定画面里雾粒的尺寸。"
            }),
        /** 结霜格数：8 + 特攻偏移[0,14]，广呼 ×1.2；夹 6..30。 */
        frost: formula(
            F.base(8, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.12).clamp(0, 14).as("特攻"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(1.2), F.const(1)).as("呼法"))
                .clamp(6, 30).round(0),
            "结霜格数", {
                unit: "块",
                description: "冷雾在被打到的人脚下结出多少格霜；特攻越高结得越多。它同时驱动画面里霜点的数量。"
            }),
        /** 结霜停留：80 + 等级(≥25)偏移[0,40]；夹 60..180。 */
        frostTicks: seconds(
            F.base(80, "基础")
                .plus(F.level().minus(25).times(1).clamp(0, 40).as("等级"))
                .clamp(60, 180).round(0),
            "结霜停留", "霜在地面停留多久；等级越高留得越久。到期原方块回来。"),
        /** 冻僵时长：40 + 等级(≥25)偏移[0,20]，广呼 ×1.15；夹 30..90。 */
        chillTicks: seconds(
            F.base(40, "基础")
                .plus(F.level().minus(25).times(0.6).clamp(0, 20).as("等级"))
                .times(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(1.15), F.const(1)).as("呼法"))
                .clamp(30, 90).round(0),
            "冻僵时长", "被冷雾罩住的人移动变慢多久；等级越高越久，广呼更冷。"),
        /** 雾点数量：20 + 特攻偏移[0,26] + 等级(≥25)偏移[0,10]；夹 16..60。 */
        motes: formula(
            F.base(20, "基础")
                .plus(F.stat("specialAttack").minus(55).times(0.2).clamp(0, 26).as("特攻"))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10).as("等级"))
                .clamp(16, 60).round(0),
            "雾点数量", {
                unit: "点",
                description: "冷雾里翻涌的霜点数量，随特攻与等级增长；粒子按它发射，画面里的雾量与机制一致。"
            }),
        /** 起手：12 − 速度偏移[−2,3]，广呼 +2；夹 7..18。 */
        tempo: seconds(
            F.base(12, "基础")
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(2), F.const(0)).as("呼法"))
                .clamp(7, 18).round(0),
            "起手", "深吸一口气、把冷气压到嘴边需要多久；速度越快起得越短，广呼要多吸一口。"),
        /** 收招：9 − 速度偏移[−1.5,2]；夹 6..13。 */
        aftercast: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2).as("速度")).clamp(6, 13).round(0),
            "收招", "呼完冷雾后的收势；快的个体收得干脆。"),
        /** 冷却：34 − 速度偏移[−4,6]，广呼 +5；夹 22..48。 */
        recharge: seconds(
            F.base(34, "基础")
                .minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6).as("速度"))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.frostbreath.preference.wide")), F.const(5), F.const(0)).as("呼法"))
                .clamp(22, 48).round(0),
            "冷却", "两口冷雾之间的等待；速度越快回得越快，广呼蓄得更久。PP 10 的代价。")
    });

    defineDamage(frostbreathId, "breath", {});

    stages(frostbreathId, [
        { level: 30, values: { breath: 60, spread: 70 } },
        { level: 46, values: { breath: 72, frost: 12, chillTicks: 55 } }
    ]);

    describe(frostbreathId, [
        { key: "description.0", values: ["breath", "spread"] },
        { key: "description.1", values: ["reach", "cloudSpeed"] },
        { key: "description.2", values: ["chillTicks", "frost", "frostTicks"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.breath", "tier.0.spread"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.breath", "tier.1.frost", "tier.1.chillTicks"] }
    ]);
}
