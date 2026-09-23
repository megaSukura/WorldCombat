/**
 * 贝壳夹击 / clamp 的参数与伤害段。
 *
 * 原生事实：Water／物理／威力 35／命中 85／PP 15／单目标／contact／volatile partiallytrapped（4–5 回合）。
 *
 * 翻译：把「用厚实贝壳夹住对手」翻成一次**贴身擒抱**——施法者把壳合上咬住身边的对手，自己也跟着被
 * 钉在原地（它必须留在对手身上才算夹住），壳一开一合地碾，每隔一会儿碾一次，直到撑满时长或被打断。
 * 对手撑开、被击退扯开、或任一方倒下都会松开。它是本组唯一「施法者也动不了」的招，代价与收益都由这一点派生。
 * 与同族分开：
 *   贝壳夹击 —— 施法者贴身咬住，双方一起被钉住，力量来自自己的厚度与重量。
 *   捕兽夹   —— 夹子布在地上，施法者走开，夹到谁是谁。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   crush       每跳碾压威力 16 + 防御偏移 + 体重偏移 + 等级偏移（壳越厚、身体越沉碾得越重）。
 *   holdTicks   夹持时长 110 刻 + 防御偏移 + 等级偏移（壳硬的撑得久）。
 *   interval    两跳间隔 22 刻 − 速度偏移（出手快的碾得密）。
 *   lunge       扑身距离 1.1 格 + 速度偏移（快的人能补上一步）。
 *   holdRange   维持距离 2.4 格 + 宽度偏移（体型宽的人夹得住更远的目标）。
 *   straps      碾壳粒子量 12 + 防御 ×0.12（同时驱动画面密度）。
 *   tempo       起手 10 刻 − 速度偏移。
 *
 * 配置 `grind`（磨壳式）：开启＝每跳 ×0.62、间隔 ×0.72、夹持 ×1.25，跳数更多、被钉更久，
 * 适合等队友来收；关闭＝每跳满值、间隔更长、夹持更短，自己更快脱离。两向各有适用局面。
 *
 * 伤害段 `crush` 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("clamp", {
        /** 碾压威力：16 + 防御偏移[−4,26] + 体重偏移[−2,14] + 等级(≥25)偏移[0,8]；磨壳 ×0.62；夹 10..66。 */
        crush: formula(
            F.base(16)
                .plus(F.stat("defence").minus(120).times(0.12).clamp(-4, 26))
                .plus(F.body("weight").minus(60).times(0.04).clamp(-2, 14))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("grind"), F.const(0.62), F.const(1)))
                .clamp(10, 66).round(1),
            "碾压威力", {
                base: 16, unit: "威力",
                description: "壳每碾一下对夹住的目标结算一次的基础威力；防御越高、身体越沉、等级越高碾得越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 夹持时长：110 + 防御偏移[−20,50] + 等级(≥30)偏移[0,24]；磨壳 ×1.25；夹 60..210。 */
        holdTicks: seconds(
            F.base(110)
                .plus(F.stat("defence").minus(120).times(0.45).clamp(-20, 50))
                .plus(F.level().minus(30).times(0.6).clamp(0, 24))
                .times(F.when(F.pref("grind"), F.const(1.25), F.const(1)))
                .clamp(60, 210).round(0),
            "夹持时长", "壳闭合着不放开的时长；防御与等级越高夹得越久，磨壳式再延长，但自己也被钉更久。"),
        /** 两跳间隔：22 − 速度偏移[−2,5]；磨壳 ×0.72；夹 10..30。 */
        interval: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.04).clamp(-2, 5))
                .times(F.when(F.pref("grind"), F.const(0.72), F.const(1)))
                .clamp(10, 30).round(0),
            "两跳间隔", "壳两次碾合之间隔多久；速度越快碾得越密，磨壳式间隔更短。"),
        /** 扑身距离：1.1 + 速度偏移[−0.2,0.5]；夹 0.8..1.8。 */
        lunge: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5)).clamp(0.8, 1.8).round(2),
            "扑身距离", {
                base: 1.1, unit: "格",
                description: "出手时朝目标补上的那一步；速度快的个体能补得更远，更容易咬住擦身而过的目标。"
            }),
        /** 维持距离：2.4 + 宽度偏移[−0.2,1.0]；夹 2.0..3.4。 */
        holdRange: formula(
            F.base(2.4).plus(F.body("width").minus(0.9).times(0.8).clamp(-0.2, 1.0)).clamp(2.0, 3.4).round(2),
            "维持距离", {
                base: 2.4, unit: "格",
                description: "咬住后双方相距超过这个距离就松开；体型越宽咬住的容差越大。它也是本招的目标接受距离。"
            }),
        /** 碾壳粒子量：12 + 防御 ×0.12；夹 10..42。同时驱动画面密度。 */
        straps: formula(
            F.base(12).plus(F.stat("defence").times(0.12)).clamp(10, 42).round(0),
            "碾壳数量", {
                base: 12, unit: "个",
                description: "每次碾合时壳缝里迸出的碎屑量；随防御增长，也决定画面里那一下的密度。"
            }),
        /** 起手：10 − 速度偏移[−1.5,2.0]；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.0)).clamp(6, 14).round(0),
            "起手", "把壳张开、选准角度再合上的时间；速度越快起手越短。"),
        maxTargets: hidden(1)
    });

    defineDamage("clamp", "crush", {}, { contact: true });

    stages("clamp", [
        { level: 44, values: { crush: 24, holdTicks: 130 } }
    ]);

    describe("clamp", [
        { key: "description.0", values: ["crush"] },
        { key: "description.1", values: ["holdTicks","interval"] },
        { key: "description.2", values: ["holdRange","lunge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["grind"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["grind"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush", "tier.0.holdTicks"] }
    ]);
}
