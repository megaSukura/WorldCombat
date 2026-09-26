/**
 * 治愈铃声 / Heal Bell —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 5、优先度 0、target allyTeam；
 *   onHit 对「自己一侧」的每个成员 cureStatus（sound 类招式，soundproof 的伙伴免疫）。它清的是全部主异常：
 *   中毒／剧毒、灼伤、麻痹、睡眠、冰冻。
 *
 * 世界化：把「一次铃响洗掉整队异常」翻成即时战斗里一圈会向外扩开的**声波**——铃声以施法者为心，
 *   每一次铃声都扫过 chimeRadius 内的伙伴，把他们身上的有害状态效果震散；能响几声由速度决定，铃声之间
 *   谁有异常就洗谁。它不回复生命，也不留任何持续状态：铃声是**当场的一下**，讲究在对方挂上异常的
 *   那一刻把整队一次洗掉（与「芳香治疗」那片会停留、反复净化的香云明确分开）。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   chimeRadius  铃声能传多远：特攻（声音的底气）与等级决定半径；长鸣档 ×1.25。
 *   peals        铃响几声：速度决定；长鸣档多一声。
 *   pealGap      每声之间：速度决定，越快越利落。
 *   motes        铃光点数：特防与体型决定，直接驱动粒子量。
 *   tempo        起手：速度决定；长鸣档更慢。
 *   aftercast    收招：体型高度决定。
 *   recharge     冷却：等级提高熟练度；长鸣档更长。
 * 配置 resonant（长鸣／短鸣）双向取舍：长鸣半径 ×1.25、多响一声，代价是起手 ×1.2、冷却 ×1.15；
 *   短鸣起手 ×0.9、冷却 ×0.95，但半径不变、声数不变（一次迅捷的净化）。
 */
namespace PokemonSkills {
    export const healbellId = "healbell";
    export const healbellScene = "world_combat:move_healbell";
    export const healbellCleanseText = "world_combat.move.healbell.text.cleanse";
    export const healbellNoneText = "world_combat.move.healbell.text.none";
    const healbellResonant = { key: "worldcombat.skill." + healbellId + ".preference.resonant" };

    actionParameters.define(healbellId, {
        chimeRadius: formula(
            F.base(4.0)
                .plus(F.stat("specialAttack").minus(50).times(0.012).clamp(-1.0, 2.0).as("特攻修正"))
                .plus(F.level().minus(20).max(0).times(0.03).clamp(0, 1.0).as("等级修正"))
                .times(F.when(F.pref("resonant", healbellResonant), F.const(1.25), F.const(1)).as("长鸣"))
                .clamp(3.0, 8.5).round(2),
            "铃声半径", { unit: " 格", description: "一声铃响能传多远；特攻越高、等级越高传得越远，长鸣档 ×1.25。范围即判定，站在环外不会被洗到。" }),
        peals: formula(
            F.base(1).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2).as("速度修正"))
                .plus(F.when(F.pref("resonant", healbellResonant), F.const(1), F.const(0)).as("长鸣"))
                .clamp(1, 3).round(),
            "铃响次数", { unit: " 声", description: "一次施放里铃响几声；速度越快响得越多，长鸣档多一声。每一声都洗一次范围内的异常。" }),
        pealGap: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4).as("速度修正")).clamp(5, 12).round(0),
            "铃声间隔", "相邻两声之间隔多久；速度越快越紧凑。"),
        motes: formula(
            F.base(16).plus(F.stat("specialDefence").times(0.06)).plus(F.body("height").times(2)).clamp(12, 40).round(0),
            "铃光", { unit: " 点", description: "铃声迸出的净光点数量；特防与体型越大越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 3).as("速度修正"))
                .times(F.when(F.pref("resonant", healbellResonant), F.const(1.2), F.const(0.9)).as("长鸣"))
                .clamp(5, 18).round(0),
            "起手", "把铃声送出去之前的准备；速度越快越短，长鸣档更慢。准备期间可以移动，铃声每次从施术者当前所在处响起。"),
        aftercast: seconds(
            F.base(8).plus(F.body("height").minus(1.2).times(0.5).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "铃声落定后的收势；身板越大收得稍慢。"),
        recharge: seconds(
            F.base(150).minus(F.level().times(0.6))
                .times(F.when(F.pref("resonant", healbellResonant), F.const(1.15), F.const(0.95)).as("长鸣"))
                .clamp(80, 190).round(0),
            "冷却", "两次铃声之间的等待；等级越高越熟练，长鸣档更长。", { base: 150 })
    });

    stages(healbellId, [
        { level: 45, values: { recharge: 130 } },
        { level: 65, values: { recharge: 108 } }
    ]);

    describe(healbellId, [
        { key: "description.0", values: ["chimeRadius","peals"] },
        { key: "description.1", values: ["pealGap"] },
        { key: "stance.resonant", values: [], when: function (context) { return read(context.detail.values, ["resonant"]) === true; } },
        { key: "stance.short", values: [], when: function (context) { return read(context.detail.values, ["resonant"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
