/**
 * 跃起 / splash 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 必中、PP 40、目标 self、
 *   `onTryHit` 只播一条「什么都没有发生」；它是这套数据里唯一明说「什么都不会发生」的一招。
 *
 * 世界化：把「一蹦一蹦地跳」原样翻成**只改变自己位置的一次蹦跳**——沿选定的方向弹起一小段抛物线，
 *   落地，然后什么都不会发生：没有伤害、没有状态、不碰任何人。在原作的回合制里位移没有意义，
 *   但这里世界是三维的：这一跳能越过一道坎、把自己挪出直线攻击的落点、或只是让跳不动的个体挪个窝。
 *   它是这四招里唯一只动自己的，也是唯一没有第二个参与者的。
 *
 * 数值来源（每个参数读不同的个体数据——同一招很多精灵学，身高体重与速度的差别要在场上看得见）：
 *   hopHeight  基础 0.5 格 + 等级×0.005 + 速度×0.0025 − 体重×0.00025，高跃 ×1.35，夹 0.3..1.6；
 *              轻而快的个体弹得高，沉的个体几乎贴地。它决定抛物线的高度与滞空。
 *   hopRange   基础 2.2 格 + 速度×0.012 + 等级×0.01，高跃 ×0.7，夹 1.2..4.5；速度越快跳得越远。
 *   hangTicks  基础 9 刻 + 等级×0.05，夹 7..16；滞空多久，画面与落地时机按它走。
 *   splashMotes 基础 12 点 + 等级×0.4 + 体重×0.02，夹 10..48；落地溅起的水花数，粒子量按它发射。
 *   tempo      基础 4 刻 − 速度×0.01，夹 2..6；蹲身蓄力一次弹跳。
 *   aftercast  基础 5 刻 + 碰撞箱高×1.2，夹 4..9；落地收势。
 *   recharge   基础 30 刻 − 速度×0.05，夹 14..40；两次蹦跳之间的间隔。PP 40，所以很短。
 * 配置 leap（高跃）双向取舍：开启跳得更高（×1.35）但跳得更近（射程 ×0.7），用来跨坎或躲过贴地的一击；
 *   关闭则低而远，用来换位与拉距离。两个方向各有局面。
 */
namespace PokemonSkills {
    export const splashId = "splash";
    export const splashScene = "world_combat:move_splash";
    export const splashNothingText = "world_combat.move.splash.text.nothing";

    actionParameters.define(splashId, {
        hopHeight: formula(
            F.base(0.5).as("基础").plus(F.level().times(0.005).as("等级")).plus(F.stat("speed").times(0.0025).as("速度"))
                .minus(F.body("weight").times(0.00025).as("体重"))
                .times(F.when(F.pref("leap", text("worldcombat.skill.splash.preference.leap")), F.const(1.35), F.const(1)))
                .clamp(0.3, 1.6).round(2),
            "跳跃高度", {
                unit: " 格",
                description: "这一蹦弹起多高；轻而快的个体弹得高，沉的个体几乎贴地，高跃式再 ×1.35。它决定抛物线的高度。"
            }),
        hopRange: formula(
            F.base(2.2).as("基础").plus(F.stat("speed").times(0.012).as("速度")).plus(F.level().times(0.01).as("等级"))
                .times(F.when(F.pref("leap", text("worldcombat.skill.splash.preference.leap")), F.const(0.7), F.const(1)))
                .clamp(1.2, 4.5).round(2),
            "跳跃距离", {
                unit: " 格",
                description: "这一蹦能把自己带多远；速度越快跳得越远，高跃式改为近而高。它就是本招的射程。"
            }),
        hangTicks: seconds(
            F.base(9).plus(F.level().times(0.05).as("等级")).clamp(7, 16).round(0),
            "滞空", "离地到落地大约多久；等级越高越稳，画面与落地时机按它走。"),
        splashMotes: formula(
            F.base(12).plus(F.level().times(0.4).as("等级")).plus(F.body("weight").times(0.02).as("体重")).clamp(10, 48).round(0),
            "水花数", {
                unit: " 点",
                description: "落地时溅起的水花与尘点数量；等级与体重越大越多，粒子按它发射。"
            }),
        tempo: seconds(F.base(4).minus(F.stat("speed").times(0.01).as("速度")).clamp(2, 6).round(0), "起手",
            "蹲身蓄这一次弹跳需要多久；速度越快越短。"),
        aftercast: seconds(F.base(5).plus(F.body("height").times(1.2).as("身板")).clamp(4, 9).round(0), "收招",
            "落地之后的收势；身板越大越慢。"),
        recharge: seconds(F.base(30).minus(F.stat("speed").times(0.05).as("速度")).clamp(14, 40).round(0), "冷却",
            "两次蹦跳之间的间隔；速度越快越短。PP 40，所以出手很便宜。")
    });

    describe(splashId, [
        { key: "description.0", values: ["hopHeight", "hopRange"] },
        { key: "description.1", values: ["hangTicks"] },
        { key: "leap.on", values: [], when: function (context) { return read(context.detail.values, ["leap"]) === true; } },
        { key: "leap.off", values: [], when: function (context) { return read(context.detail.values, ["leap"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
