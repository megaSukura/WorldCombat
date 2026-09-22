/**
 * 森林诅咒 / forestscurse — 参数与机制数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：草、变化、威力 0、命中 100、PP 20、优先度 0、目标 normal（单体）；
 *   `onHit` 给目标**追加**草属性：已有草属性时失败，`addType` 装不下第三个属性时也失败。
 *
 * 世界化：向对手种下森林的诅咒——根须从它脚下的地面钻出把它缠住，落叶从头顶罩下，苔藓在原处生根。
 *   属性落成共享 NativeModifiers types 层（现有属性追加一条草，到期自动还原原生属性），并挂共享身份
 *   `world_combat:status/forestscurse` 的标记；命中处的地面被顶出一小块苔（`world.terrain` 租借的真方块）。
 *   只对还没占满三层属性、且不是草属性的宝可梦种得上。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach    种咒距离：体型与等级决定诅咒能落到多远。它也是本招实际射程的来源。
 *   hold     诅咒时长：等级与特攻决定根扎多深，配置「深根」明显更长。
 *   roots    根须数：特攻决定从地面钻出的根须数量（直接驱动粒子）。
 *   leaves   落叶数：速度决定头顶罩下的叶片数量（也驱动粒子）。
 *   grove    苔圈半径：体型宽度决定命中处苔藓铺开的半径，也是画面尺度。
 *   patch    苔痕维持：体重决定根扎多深、那块苔留多久。
 *   tempo    起手：速度决定诅咒画得多快，深根更慢。
 *   aftercast 收势：特防决定种完站得多稳。
 *   recharge 冷却：速度决定多久能再种一次，深根更费力。
 * 配置项 rooted（深根／浅咒）：深根维持更久、苔圈更大更久，但起手更慢、冷却更久；浅咒更快更便宜、
 *   只留一小块苔。持续与出手频率互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("forestscurse", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.body("height").minus(1.4).times(1.2).as("体型"))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.8).as("等级"))
                .clamp(4, 12).round(1),
            "种咒距离", { unit: "格", description: "诅咒能落到多远；个头越高、等级越高落得越远。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(220, "基础")
                .plus(F.level().times(3.4).as("等级"))
                .plus(F.stat("specialAttack").times(0.8).as("特攻"))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(1.7), F.const(0.6)).as("扎根深浅"))
                .clamp(100, 1400).round(),
            "诅咒时长", "被追加的草属性维持多久；等级与特攻越高根扎得越深，深根档明显更长。"),
        roots: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(6).as("特攻")).clamp(8, 36).round(),
            "根须数", { unit: "条", description: "从地面钻出、缠住目标的根须数量；特攻越高越多，画面里的根须也按它画出。" }),
        leaves: formula(
            F.base(14, "基础").plus(F.stat("speed").div(4).as("速度")).clamp(12, 40).round(),
            "落叶数", { unit: "片", description: "从头顶罩下的叶片数量；速度越快越密。" }),
        grove: formula(
            F.base(1.6, "基础").plus(F.body("width").minus(0.9).times(1).as("体型"))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(1.35), F.const(0.8)).as("苔圈范围"))
                .clamp(1.2, 3.2).round(1),
            "苔圈半径", { unit: "格", description: "命中处苔藓铺开的半径，也是判定与画面尺度；体型越宽越广，深根更大。" }),
        patch: seconds(
            F.base(110, "基础").plus(F.body("weight").div(2500).as("体重"))
                .times(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(1.8), F.const(0.6)).as("苔痕深浅"))
                .clamp(80, 480).round(),
            "苔痕维持", "被顶出的那一小块苔留多久；越沉的目标根扎得越深，深根档留得更久。它是一格真方块。"),
        tempo: seconds(
            F.base(10, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 4).as("速度"))
                .plus(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(3), F.const(0)).as("深根起手"))
                .clamp(5, 14).round(),
            "种咒起手", "把诅咒画出来所需时间；速度越快起得越快，深根更慢。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "种完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(96, "基础").minus(F.stat("speed").times(0.28).as("速度"))
                .plus(F.when(F.pref("rooted", text("worldcombat.skill.forestscurse.preference.rooted")), F.const(20), F.const(-10)).as("深根代价"))
                .clamp(44, 140).round(),
            "再种冷却", "再种一次诅咒需要多久；速度快的个体更快恢复，深根更费力。")
    });

    stages("forestscurse", [{ level: 40, values: { cooldown: 86 } }, { level: 55, values: { cooldown: 74 } }]);

    describe("forestscurse", [
        { key: "description.0", values: ["hold", "roots"] },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "description.2", values: ["grove", "leaves", "patch"] },
        { key: "rooted.on", values: ["hold", "recharge"], when: function (context) { return read(context.detail.values, ["rooted"]) === true; } },
        { key: "rooted.off", values: ["patch"], when: function (context) { return read(context.detail.values, ["rooted"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
