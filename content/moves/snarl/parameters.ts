/**
 * 大声咆哮 / snarl 的参数与伤害段。
 *
 * 原生事实：恶／特殊／威力 55／命中 95／PP 15／目标 allAdjacentFoes／次要效果 100% 特攻 −1／
 *   flags 含 sound、bypasssub（声音类，不看视线）。
 *
 * 翻译：把「没完没了地大声斥责」翻成**一声接一声、朝身前推出去的锥形怒吼**——不是一次结算，
 *   而是同一道锥形声压连着喝几遍：第一遍喝住的人特攻被骂下去，后面的每一遍继续削血，对手可以
 *   趁两声之间走出锥外躲掉。它和虫鸣（一道连续的声波、近强远弱、概率碾防）分开的地方就是这条
 *   「按拍」的节奏：连斥式三声轻、断喝式一声重。恶属性的声压不查视线，但一次只罩住身前一锥。
 *
 * 数值来源（每项依赖不同的精灵数据，分散开来，小差距才会在场上变成看得见的不同）：
 *   bark        每声威力：特攻定斥责的穿透力，等级定底气；连斥式每声 ×0.62、断喝式 ×1.4。
 *   pulses      声数：连斥 3 声／断喝 1 声。
 *   gap         两声间隔：速度决定骂得急不急，连斥式更密。
 *   spaDrop     被第一声喝住者的特攻下降级数：原生 1 级，等级 ≥50 升到 2 级。
 *   hushTicks   被斥身份时长：等级与亲密度决定留多久，连斥式更长。
 *   reach       声压锥长：碰撞箱高度与等级决定推多远，连斥式更远。
 *   arc         声压张角：身高与体重决定喉咙多宽，连斥式收窄、断喝式放开。
 *   notes       音符量：特攻决定一次吐出多少音符，也驱动画面密度。
 *   tempo       起手：速度决定吸气出声的快慢。
 *   recover     收招：速度决定收势。
 *   recharge    冷却：等级决定熟练度，连斥式更久。PP 15 的代价。
 *
 * 伤害段 `bark` 与参数同名，走共享换算（原始类别 Special）；`sound: true` 让原生隔音类能力参与。
 * 特攻下降走共享能力等级阶梯 NativeEffects.boost(..., "spa", -n)，身份落在 world_combat:status/snarled。
 */
namespace PokemonSkills {
    actionParameters.define("snarl", {
        /** 每声威力：24 + 特攻偏移[−8,26] + 等级(≥25)偏移[0,10]；连斥 ×0.62 / 断喝 ×1.4；夹 14..64。 */
        bark: formula(
            F.base(24)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-8, 26))
                .plus(F.level().minus(25).times(0.35).clamp(0, 10))
                .times(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(0.62), F.const(1.4)))
                .clamp(14, 64).round(1),
            "每声威力", {
                unit: "威力",
                description: "每一声怒吼对锥内每人结算一次的基础威力；连斥式每声更轻、断喝式一声更重。对手特防、相性与暴击在每声命中时另算。"
            }),
        /** 声数：连斥 3／断喝 1；夹 1..4。 */
        pulses: formula(
            F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(3), F.const(1)).clamp(1, 4).round(0),
            "声数", { unit: "声", description: "一次施放连着喝几声；连斥式三声、断喝式一声。走出声压锥就能躲开后面还没出口的。" }),
        /** 两声间隔：7 − 速度偏移[−1.2,2.0]；连斥 ×0.8；夹 4..11。 */
        gap: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.2, 2.0))
                .times(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(0.8), F.const(1)))
                .clamp(4, 11).round(0),
            "两声间隔", "两声怒吼之间隔多久；速度越快骂得越急，连斥式更密。"),
        /** 特攻下降：原生 1 级，等级 ≥50 升到 2 级；夹 1..2。 */
        spaDrop: formula(
            F.base(1).clamp(1, 2).round(0),
            "特攻下降", { unit: "级", description: "被第一声喝住的目标特攻下降的能力等级；原生 1 级，等级达到 50 时升到 2 级。" }),
        /** 被斥时长：90 + 等级(≥25)偏移[0,60] + 亲密度 ×0.5；连斥 ×1.3；夹 70..280。 */
        hushTicks: seconds(
            F.base(90)
                .plus(F.level().minus(25).times(0.8).clamp(0, 60))
                .plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(1.3), F.const(1)))
                .clamp(70, 280).round(0),
            "被斥时长", "「被斥」身份留多久；等级与亲密度越高留得越久，连斥式更长。"),
        /** 声压锥长：4 + 身高偏移[−0.6,1.6] + 等级(≥25)偏移[0,0.6]；连斥 ×1.15；夹 3.5..8.5。 */
        reach: formula(
            F.base(4)
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-0.6, 1.6))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(1.15), F.const(1)))
                .clamp(3.5, 8.5).round(2),
            "声压长度", {
                unit: "格",
                description: "声压锥推出去多远；碰撞箱越高、等级越高推得越远，连斥式再多 15%。画面里的锥形铺到哪，就是会被喝到哪。"
            }),
        /** 声压张角：55 + 身高偏移[−5,16] + 体重/300；连斥 ×0.85 / 断喝 ×1.1；夹 35..120。 */
        arc: formula(
            F.base(55)
                .plus(F.body("height").minus(1.4).times(10).clamp(-5, 16))
                .plus(F.body("weight").div(300))
                .times(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(0.85), F.const(1.1)))
                .clamp(35, 120).round(0),
            "声压张角", { unit: "度", description: "声压锥张开的总角度；身板越高、体重越大张得越开，连斥式收窄、断喝式放开。判定与画面用同一个角度。" }),
        /** 音符量：16 + 特攻偏移[0,28]；夹 14..44。同时驱动画面密度。 */
        notes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).max(0).times(0.3)).clamp(14, 44).round(0),
            "音符量", { unit: "个", description: "一次怒吼吐出的音符数量，也驱动画面密度；特攻越高吐得越多。" }),
        /** 起手：6 − 速度偏移[−1.5,2.0]；夹 4..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.0)).clamp(4, 12).round(0),
            "起手", "吸气、把骂声压到嘴边的时间；速度越快越早开口。"),
        /** 收招：7 − 速度偏移[−1,2]；夹 4..11。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "骂完收势的时间；速度越快收得越利落。"),
        /** 冷却：82 − 等级(≥25)偏移[0,25]；连斥 +6；夹 55..104。 */
        recharge: seconds(
            F.base(82).minus(F.level().minus(25).times(0.5).clamp(0, 25))
                .plus(F.when(F.pref("rant", text("worldcombat.skill.snarl.preference.rant")), F.const(6), F.const(0)))
                .clamp(55, 104).round(0),
            "冷却", "两次施放之间的等待；等级越高越熟练，连斥式更费力。PP 15 的代价。")
    });

    defineDamage("snarl", "bark", {}, { sound: true });

    stages("snarl", [
        { level: 50, values: { bark: 34, spaDrop: 2, reach: 5.5 } }
    ]);

    describe("snarl", [
        { key: "description.0", values: ["bark", "pulses", "gap"] },
        { key: "description.1", values: ["spaDrop", "hushTicks"] },
        { key: "description.2", values: ["reach", "arc", "notes"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["rant"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["rant"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bark", "tier.0.spaDrop", "tier.0.reach"] }
    ]);
}
