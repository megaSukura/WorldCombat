/**
 * 魔法粉 / magicpowder — 参数与机制数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：超能、变化、威力 0、命中 100、PP 20、优先度 0、目标 normal（单体）；
 *   flags 含 powder（粉末类）；`onHit` 把目标的属性置成单一超能力，已经是纯超能力时失败。
 *
 * 世界化：向对手撒一把会改写身体的魔法粉——粉末团飘过去罩住它，把它**当前的全部属性改写为单一超能力**。
 *   属性层由 NativeModifiers 的 types 层承担，到期自动还原原生属性；同时挂共享身份
 *   `world_combat:status/magicpowder` 的标记。作为粉末类招式，草属性生物把粉从身上抖掉、完全免疫。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach    撒粉距离：体型决定粉末团能飘多远，配置「细撒」缩短射程换取更久维持。
 *   hold     改写时长：等级与特防决定这层超能力撑多久，细撒档明显更长。
 *   cloud    粉团半径：体型宽度决定命中处那团粉的半径，也是判定与画面尺度。
 *   motes    粉粒数：特攻决定撒出与残留的粉粒数量（直接驱动粒子）。
 *   glints   闪点数：等级决定粉里泛起的超能闪点数量（也驱动粒子）。
 *   tempo    起手：速度决定抖粉多快，细撒档更慢。
 *   aftercast 收势：特防决定撒完站得多稳。
 *   recharge 冷却：速度决定多久能再撒一把，细撒更便宜但覆盖窄。
 * 配置项 sift（细撒／一把撒出）：细撒射程更短、起手更慢，换来更久的改写时长；一把撒出射程长、起手快、
 *   更便宜，但改写更短。射程与持续互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("magicpowder", {
        reach: formula(
            F.base(7, "基础")
                .plus(F.body("height").minus(1.4).times(1.2).as("体型"))
                .times(F.when(F.pref("sift", text("worldcombat.skill.magicpowder.preference.sift")), F.const(0.65), F.const(1)).as("细撒距离"))
                .clamp(4, 12).round(1),
            "撒粉距离", { unit: "格", description: "粉末团能飘到多远；个头越高越远，细撒档主动收短。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(160, "基础")
                .plus(F.level().times(3.2).as("等级"))
                .plus(F.stat("specialDefence").div(3.8).as("特防"))
                .times(F.when(F.pref("sift", text("worldcombat.skill.magicpowder.preference.sift")), F.const(1.7), F.const(0.7)).as("细撒持久"))
                .clamp(80, 1000).round(),
            "改写时长", "对手被改写成超能力属性多久；等级与特防越高越难散，细撒档明显更长。"),
        velocity: formula(
            F.base(0.8, "基础")
                .plus(F.stat("specialAttack").div(2600).as("特攻"))
                .plus(F.body("weight").div(90000).as("体重"))
                .clamp(0.5, 1.3).round(2),
            "粉速", { unit: "格/刻", description: "粉团飘出去的速度；特攻与体重越大越快，越难在飘到前躲开。" }),
        cloud: formula(
            F.base(1.2, "基础").plus(F.body("width").minus(0.9).times(0.8).as("体型")).clamp(0.9, 2.2).round(2),
            "粉团半径", { unit: "格", description: "命中处那团粉的半径，也是判定与画面尺度；体型越宽越广。" }),
        motes: formula(
            F.base(18, "基础").plus(F.stat("specialAttack").div(5).as("特攻")).clamp(16, 60).round(),
            "粉粒数", { unit: "点", description: "一把撒出与残留在身上的粉粒数量；特攻越高越密，画面里的粉点也按它画出。" }),
        glints: formula(
            F.base(8, "基础").plus(F.level().div(5).as("等级")).clamp(8, 24).round(),
            "闪点数", { unit: "点", description: "粉里泛起的超能闪点数量；等级越高越亮。" }),
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("sift", text("worldcombat.skill.magicpowder.preference.sift")), F.const(2), F.const(0)).as("细撒起手"))
                .clamp(4, 12).round(),
            "起手", "在手里抖匀这把粉所需时间；速度越快起得越快，细撒更慢。"),
        aftercast: seconds(
            F.base(6, "基础").plus(F.stat("specialDefence").minus(50).div(55).clamp(-1, 2).as("特防")).clamp(4, 10).round(),
            "收势", "撒完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(74, "基础").minus(F.stat("speed").times(0.26).as("速度"))
                .plus(F.when(F.pref("sift", text("worldcombat.skill.magicpowder.preference.sift")), F.const(14), F.const(-8)).as("细撒代价"))
                .clamp(36, 120).round(),
            "再撒冷却", "再撒一把需要多久；速度快的个体更快恢复，细撒更费力。")
    });

    stages("magicpowder", [{ level: 40, values: { cooldown: 64 } }, { level: 55, values: { cooldown: 54 } }]);

    describe("magicpowder", [
        { key: "description.0", values: ["hold"] },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "description.2", values: ["cloud", "velocity"] },
        { key: "sift.on", values: ["hold", "reach"], when: function (context) { return read(context.detail.values, ["sift"]) === true; } },
        { key: "sift.off", values: ["recharge"], when: function (context) { return read(context.detail.values, ["sift"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
