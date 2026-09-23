/**
 * 镜面属性 / reflecttype — 参数与机制数值来源。
 *
 * 核心念头：举一面镜子照住对手，把它的属性原样反射到自己身上——它现在是什么属性，我就变成什么属性。
 *   照的是「现在」，所以对手被改过属性（纹理、保护色、燃尽之类）时自己也跟着变。
 * 原生：Normal／变化／必中／PP 15／单体；source 是阿尔宙斯／银伴战兽时不发动，读目标当前类型并置为自己。
 * 即时化把结果落成共享 NativeModifiers types 层（与纹理、保护色同一套机制），到期还原原生属性，
 *   并挂共享身份 `world_combat:status/reflecttype` 的标记。目标不是宝可梦就没有属性可照，预检直接拒绝。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     照映距离：体型与等级决定镜子能照到多远。它也是本招实际射程的来源。
 *   tempo     举镜起手：速度决定镜子抬起来多快。
 *   aftercast 收势：特防决定照完站得多稳。
 *   hold      映照维持：等级与特防支撑这层镜子属性维持多久，镜像全部再乘一个系数。
 *   recharge  冷却：速度决定多久能再照一次。
 *   facets    镜面数：特防决定镜面拼出的块数。
 *   glints    反光数：特攻决定反射出去的光点数量。
 * 配置项 pair（镜像全部／只取主属）：镜像全部连副属性一起抄、更久也更贵；
 *   只取主属更便宜，能避开副属性带来的额外弱点。取舍在「抄得像」与「抄得省、少露破绽」之间。
 */

namespace PokemonSkills {
    actionParameters.define("reflecttype", {
        reach: formula(
            F.base(8, "基础")
                .plus(F.body("height").minus(1.4).times(1.3).as("体型"))
                .plus(F.level().minus(30).times(0.05).clamp(0, 2).as("等级"))
                .clamp(6, 14).round(1),
            "照映距离", { unit: "格", description: "镜子能照到多远；个头越高、等级越高照得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").minus(40).times(0.045).clamp(-2, 4.5).as("速度")).clamp(3, 10).round(),
            "举镜起手", "举起镜子所需时间；速度越快起得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(46).clamp(-1, 2.4).as("特防")).clamp(4, 12).round(),
            "收势", "照完后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(140, "基础")
                .plus(F.level().times(3.4).as("等级"))
                .plus(F.stat("specialDefence").div(3.4).as("特防"))
                .times(F.when(F.pref("pair").as("镜像全部"), F.const(1.25), F.const(0.8)).as("镜像范围"))
                .clamp(90, 1200).round(),
            "映照维持", "照到的属性维持多久；等级与特防越高越久，镜像全部再延长。"),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.28).as("速度")).clamp(36, 120).round(),
            "再照冷却", "再照一次需要多久；速度快的个体更快恢复。"),
        facets: formula(
            F.base(6, "基础").plus(F.stat("specialDefence").div(7).as("特防")).clamp(6, 18).round(),
            "镜面数", { unit: "块", description: "镜子拼出的块数；特防越高越完整。" }),
        glints: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(7).as("特攻")).clamp(10, 32).round(),
            "反光数", { unit: "点", description: "反射出去的光点数量；特攻越高越亮。" })
    });

    stages("reflecttype", [{ level: 35, values: { cooldown: 68 } }, { level: 50, values: { cooldown: 58 } }]);

    describe("reflecttype", [
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["hold"] },
        { key: "pair.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.pair); } },
        { key: "pair.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.pair); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
