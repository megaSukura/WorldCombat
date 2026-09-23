/**
 * 单纯光束 / simplebeam — 参数与机制数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：一般、变化、威力 0、命中 100、PP 15、优先度 0、目标 normal（单体）；
 *   `onTryHit` 在目标特性带 cantsuppress、已经是 simple、或特性是 truant 时失败；命中后把目标的特性置成 simple。
 *
 * 世界化：向对手发一道谜之念波，击中它的脑子、把特性整个改写成「单纯」。特性落成共享 NativeModifiers ability 层
 *   （到期自动还原原生特性），并挂共享身份 `world_combat:status/simplebeam` 的标记。念波是一束来不及躲的光，
 *   所以它在视线畅通、够得着的瞬间就落到目标身上；配置「念波扩散」让它在目标处炸开、扫到附近一圈脑子。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     念波射程：体型与特攻决定光束能打多远。它也是本招实际射程的来源。
 *   hold      改写时长：等级与特攻决定这个「单纯」撑多久，扩散波明显更短。
 *   rings     念波环数：特攻决定沿光束一条条推过去的光环数量（直接驱动粒子）。
 *   beam      光束粗细：特攻决定光束的厚度，也是画面尺度。
 *   fan       扩散半径：体型宽度决定念波在目标处炸开、扫到多大一圈，配置关闭时为 0。
 *   tempo     起手：速度决定念头聚多快。
 *   aftercast 收势：特防决定发完站得多稳。
 *   recharge  冷却：速度决定多久能再发一道，扩散波更费力。
 * 配置项 wave（念波扩散／单束）：扩散波在目标处炸开、把附近一圈人的特性一起改简单，但每层维持更短、冷却更久；
 *   单束只打一个目标、维持更久、出手更快。覆盖与持续互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("simplebeam", {
        reach: formula(
            F.base(9, "基础")
                .plus(F.body("height").minus(1.4).times(1).as("体型"))
                .plus(F.stat("specialAttack").div(60).as("特攻"))
                .clamp(7, 15).round(1),
            "念波射程", { unit: "格", description: "这道谜之念波能打多远；个头越高、特攻越强打得越远。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(190, "基础")
                .plus(F.level().times(3.2).as("等级"))
                .plus(F.stat("specialAttack").times(0.7).as("特攻"))
                .times(F.when(F.pref("wave", text("worldcombat.skill.simplebeam.preference.wave")), F.const(0.6), F.const(1.35)).as("扩散摊薄"))
                .clamp(100, 1200).round(),
            "改写时长", "对手的特性被改成「单纯」多久；等级与特攻越高越久，扩散波摊薄后更短。"),
        rings: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(8).as("特攻")).clamp(6, 22).round(),
            "念波环数", { unit: "道", description: "沿光束一条条推过去的光环数量；特攻越高越多，画面里的光环也按它画出。" }),
        beam: formula(
            F.base(0.9, "基础").plus(F.stat("specialAttack").div(300).as("特攻")).clamp(0.7, 1.6).round(2),
            "光束粗细", { unit: "格", description: "这道念波的粗细，也是命中处爆开的尺度；特攻越高越粗。" }),
        fan: formula(
            F.base(2, "基础").plus(F.body("width").minus(0.9).times(0.8).as("体型"))
                .times(F.when(F.pref("wave", text("worldcombat.skill.simplebeam.preference.wave")), F.const(1.6), F.const(0)).as("扩散开关"))
                .clamp(0, 4.5).round(1),
            "扩散半径", { unit: "格", description: "念波在目标处炸开、扫到多大一圈；体型越宽越广，关闭扩散时为 0。" }),
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 3).as("速度")).clamp(4, 11).round(),
            "起手", "把念头聚成一束所需时间；速度越快起得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "发完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(78, "基础").minus(F.stat("speed").times(0.26).as("速度"))
                .plus(F.when(F.pref("wave", text("worldcombat.skill.simplebeam.preference.wave")), F.const(18), F.const(-8)).as("扩散代价"))
                .clamp(38, 130).round(),
            "再发冷却", "再发一道需要多久；速度快的个体更快恢复，扩散波更费力。", { base: 78 })
    });

    stages("simplebeam", [{ level: 40, values: { recharge: 68 } }, { level: 55, values: { recharge: 56 } }]);

    describe("simplebeam", [
        { key: "world", values: ["hold"] },
        { key: "description.0", values: ["hold"] },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "description.2", values: ["fan"] },
        { key: "wave.on", values: ["fan", "recharge"], when: function (context) { return read(context.detail.values, ["wave"]) === true; } },
        { key: "wave.off", values: ["hold"], when: function (context) { return read(context.detail.values, ["wave"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
