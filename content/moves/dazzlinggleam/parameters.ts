/**
 * 魔法闪耀 / dazzlinggleam 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：妖精、特殊、威力 80、命中 100、PP 10、
 *   target allAdjacentFoes（自身周围所有对手）、无次要效果、flags protect/mirror/metronome。
 *
 * 翻译：把「向对手发射强光」做成**以自身为中心、整圈炸开的一片强光**——施法者把周身的微光收拢到身上，
 *   再猛地放开，光浪贴着地面整圈铺开：身周所有敌人都被闪到，离得越远越弱；被闪花眼的人脚下发虚、走得慢。
 *   没有飞行物，光本身就是范围；这是本组唯一的整圈爆发。
 * 与同为整圈爆发的爆音波分开：
 *   爆音波   —— 声压、击飞、留下耳鸣、起手很长、威力很高；
 *   魔法闪耀 —— 光、不击飞、只留下一小段目眩减速、起手极短、可以反复点。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   flash       闪光威力 72 + 特攻偏移 + 等级偏移（特攻越强闪得越重）。
 *   radius      光浪半径 3.4 格 + 身高偏移 + 特攻偏移 + 等级偏移（身量大、特攻高的铺得越开）。
 *   falloff     边缘保留 0.58 − 特攻偏移（特攻越高光越均匀、衰减越小）。
 *   dazzleTicks 目眩时长 50 刻 + 特攻偏移 + 等级偏移（闪得越花眼，走得越慢越久）。
 *   rays        放射光道数 9 + 特攻偏移 + 等级偏移（同时驱动画面里放射的条数）。
 *   motes       光尘数量 26 + 特攻偏移（同时驱动画面密度）。
 *   tempo/aftercast/recharge  速度决定起手／收招／冷却。
 *
 * 配置 wide（散射式）双向取舍：开＝半径 ×1.22、边缘更均匀、目眩更短，代价是威力 ×0.88；
 *   关（凝聚式）＝威力 ×1.14、目眩更久，半径收到 ×0.82。两向各有局面（扫一圈 vs 啃单个）。
 *
 * 伤害段 flash 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("dazzlinggleam", {
        /** 闪光威力：72 + 特攻偏移[−14,44] + 等级(≥25)偏移[0,10]；散射 ×0.88 / 凝聚 ×1.14；夹 48..150。 */
        flash: formula(
            F.base(72)
                .plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-14, 44))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10))
                .times(F.when(F.pref("wide", text("worldcombat.skill.dazzlinggleam.preference.wide")), F.const(0.88), F.const(1.14)))
                .clamp(48, 150).round(1),
            "闪光威力", {
                unit: "威力",
                description: "整圈强光对每个敌人结算的基础威力；特攻越强、等级越高闪得越重。离中心越远越弱，按边缘保留衰减；对手特防、相性与暴击在命中时另算。"
            }),
        /** 光浪半径：3.4 + 身高偏移[−0.3,1.2] + 特攻偏移[0,0.9] + 等级(≥25)偏移[0,0.6]；散射 ×1.22 / 凝聚 ×0.82；夹 2.4..6.2。 */
        radius: formula(
            F.base(3.4)
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(0, 0.9))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("wide", text("worldcombat.skill.dazzlinggleam.preference.wide")), F.const(1.22), F.const(0.82)))
                .clamp(2.4, 6.2).round(2),
            "光浪半径", {
                unit: "格",
                description: "强光罩住身周多大一圈（空中地面一起算）；体型高、特攻强、等级高的个体铺得越开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 边缘保留：0.58 − 特攻偏移[−0.08,0.14]；散射 ×1.06 / 凝聚 ×0.85；夹 0.4..0.78。 */
        falloff: percent(
            F.base(0.58).minus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.08, 0.14))
                .times(F.when(F.pref("wide", text("worldcombat.skill.dazzlinggleam.preference.wide")), F.const(1.06), F.const(0.85)))
                .clamp(0.4, 0.78).round(2),
            "边缘保留", "光浪推到最外圈时还剩多少威力；特攻高的个体光更均匀、衰减更小，散射式外圈更亮、凝聚式中心更集中。"),
        /** 目眩时长：50 + 特攻偏移[−8,26] + 等级(≥25)偏移[0,10]；散射 ×0.85 / 凝聚 ×1.15；夹 30..96。 */
        dazzleTicks: seconds(
            F.base(50).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-8, 26))
                .plus(F.level().minus(25).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("wide", text("worldcombat.skill.dazzlinggleam.preference.wide")), F.const(0.85), F.const(1.15)))
                .clamp(30, 96).round(0),
            "目眩时长", "被闪花眼、带着 world_combat:status/dazzled 走得慢的时间；特攻越强、等级越高闪得越久，凝聚式更久。"),
        /** 放射光道数：9 + 特攻偏移[−2,5] + 等级(≥25)偏移[0,3]；夹 6..18。同时驱动画面里的放射条数。 */
        rays: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(-2, 5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 3)).clamp(6, 18).round(0),
            "放射光道数", {
                unit: "道",
                description: "光浪外圈同时射出的光道数量；特攻越高、等级越高越密，也决定画面里放射的条数。"
            }),
        /** 光尘数量：26 + 特攻偏移[−6,20]；夹 16..60。同时驱动画面密度。 */
        motes: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-6, 20)).clamp(16, 60).round(0),
            "光尘数量", {
                unit: "个",
                description: "强光炸开时迸出的细碎光点数量；随特攻增长，粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：4 − 速度偏移[−1,2]；夹 2..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.012).clamp(-1, 2)).clamp(2, 7).round(0),
            "起手", "把周身微光收拢到身上再放开的时间；这一招起手极短，快的个体几乎抬手就闪。"),
        /** 收招：6 − 速度偏移[−1,2]；夹 4..9。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.015).clamp(-1, 2)).clamp(4, 9).round(0),
            "收招", "闪完之后收光、重新站稳的时间；快的个体收得干脆。"),
        /** 冷却：24 − 速度偏移[−3,5]；散射 +4；夹 16..34。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.dazzlinggleam.preference.wide")), F.const(4), F.const(0)))
                .clamp(16, 34).round(0),
            "冷却", "两次闪光之间的等待；速度越快回得越快，散射式等得稍久。"),
        maxTargets: hidden(8)
    });

    defineDamage("dazzlinggleam", "flash", {});

    stages("dazzlinggleam", [
        { level: 40, values: { flash: 84, radius: 3.8 } }
    ]);

    describe("dazzlinggleam", [
        { key: "description.0", values: ["flash","falloff"] },
        { key: "description.1", values: ["radius","dazzleTicks"] },
        { key: "description.2", values: ["maxTargets"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flash", "tier.0.radius"] }
    ]);
}
