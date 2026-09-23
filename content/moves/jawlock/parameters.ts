/**
 * 紧咬不放 / jawlock 的参数与伤害段。
 *
 * 原生事实：恶／物理／威力 80／命中 100／PP 10／单目标／contact+bite／
 *   onHit 给双方各挂 volatile trapped（直到一方濒死，任一方退场即解除）。
 *
 * 翻译：把「咬住就不松口」翻成**一次沉重的咬合 + 一段双方都被钉住的对峙**：施法者扑上去一口咬住，
 *   咬合只结算一次（不像贝壳夹击那样每跳磨），但双方都被 rooted、谁也走不掉——咬的人嘴还咬着、
 *   被咬的人被牙钉住。效果一直持续到任一方倒下，或有人被外力（击退、位移）把两者拉开 `grip` 格以外。
 *   这份「互相钉住」的承诺就是它的代价：施法者也不能走，低血时把自己钉在别人刀下不划算。
 *
 * 与同族分开：贝壳夹击每跳磨、还封自己的动作；捕兽夹是丢在地上的装置、施法者走开；紧咬不放是
 *   **双方互锁、只咬一次、靠外力才能拆开**的擒咬，靠的是身板（物攻与体重）而不是壳的厚度。
 *
 * 数值来源（每项依赖不同的精灵数据，分散开来）：
 *   chomp       咬合威力：物攻定咬劲、体重定压迫、等级定牙口；死咬式 ×0.9、快咬式 ×1.1。
 *   lockTicks   对峙时长（到任一方倒下或被拉开为止的上限）：等级与防御决定能咬多久，死咬式更长。
 *   reach       咬合距离：碰撞箱宽度决定够得着的范围，也是本招的目标接受距离。
 *   grip        维持距离：两者相距超过它锁就断；宽度越大容差越大，死咬式更牢。
 *   lunge       扑身距离：速度决定补上去的那一步。
 *   maw         咬齿粒子量：物攻决定一次崩出多少碎屑，也驱动画面密度。
 *   tempo       起手：速度决定压身咬下的快慢。
 *   recover     收招：速度决定松口后的收势。
 *   recharge    冷却：等级决定熟练度，死咬式更久。PP 10 的代价。
 *
 * 配置 `vise`（死咬式）双向取舍：开启＝锁更牢（`lockTicks` ×1.25、`grip` +0.4）但咬合 ×0.9、冷却 +8 刻；
 *   关闭（快咬式）＝咬合 ×1.1、冷却按基础，但锁得短一些。两向各有适用局面。
 *
 * 伤害段 `chomp` 走共享换算（原始类别 Physical）；contact 与 bite 标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("jawlock", {
        /** 咬合威力：42 + 物攻偏移[−10,28] + 体重偏移[−3,12] + 等级(≥25)偏移[0,12]；死咬 ×0.9 / 快咬 ×1.1；夹 26..96。 */
        chomp: formula(
            F.base(42)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-10, 28))
                .plus(F.body("weight").minus(50).times(0.08).clamp(-3, 12))
                .plus(F.level().minus(25).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("vise", text("worldcombat.skill.jawlock.preference.vise")), F.const(0.9), F.const(1.1)))
                .clamp(26, 96).round(1),
            "咬合威力", {
                unit: "威力",
                description: "这一口咬下去结算一次的基础威力；物攻定咬劲、体重定压迫、等级定牙口，对上那一下另算防御、相性与暴击。"
            }),
        /** 对峙时长：220 + 等级(≥25)偏移[0,110] + 防御偏移[−10,40]；死咬 ×1.25；夹 180..460。 */
        lockTicks: seconds(
            F.base(220)
                .plus(F.level().minus(25).times(2.2).clamp(0, 110))
                .plus(F.stat("defence").minus(80).times(0.3).clamp(-10, 40))
                .times(F.when(F.pref("vise", text("worldcombat.skill.jawlock.preference.vise")), F.const(1.25), F.const(1)))
                .clamp(180, 460).round(0),
            "对峙时长", "双方被钉住最多这么久；等级与防御越高咬得越久，死咬式再延长。任一方倒下或被拉开就提前结束。"),
        /** 咬合距离：2.8 + 宽度偏移[−0.3,1.0]；夹 2.2..3.8。 */
        reach: formula(
            F.base(2.8).plus(F.body("width").minus(0.9).times(0.8).clamp(-0.3, 1.0)).clamp(2.2, 3.8).round(2),
            "咬合距离", {
                unit: "格",
                description: "扑到多远能够咬住目标；体型越宽够得越远。它也是本招的目标接受距离。"
            }),
        /** 维持距离：2.4 + 宽度偏移[−0.3,0.9] + 死咬 0.4；夹 1.8..3.6。 */
        grip: formula(
            F.base(2.4).plus(F.body("width").minus(0.9).times(0.7).clamp(-0.3, 0.9))
                .plus(F.when(F.pref("vise", text("worldcombat.skill.jawlock.preference.vise")), F.const(0.4), F.const(0)))
                .clamp(1.8, 3.6).round(2),
            "维持距离", {
                unit: "格",
                description: "咬住后两者相距超过这个距离就脱开；体型越宽容差越大，死咬式更牢。"
            }),
        /** 扑身距离：1.0 + 速度偏移[−0.2,0.5]；夹 0.7..1.6。 */
        lunge: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5)).clamp(0.7, 1.6).round(2),
            "扑身距离", {
                unit: "格",
                description: "出手时朝目标补上的那一步；速度快的个体扑得更远，更容易咬住擦身而过的目标。"
            }),
        /** 咬齿粒子量：12 + 物攻 ×0.1；夹 10..34。同时驱动画面密度。 */
        maw: formula(
            F.base(12).plus(F.stat("attack").times(0.1)).clamp(10, 34).round(0),
            "咬齿数量", { unit: "个", description: "咬合时从牙缝里迸出的碎屑数量，随物攻增长，也决定画面里那一下的密度。" }),
        /** 起手：9 − 速度偏移[−1.5,1.5]；夹 6..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 1.5)).clamp(6, 13).round(0),
            "起手", "压身、张颚再一口咬下的时间；速度越快咬得越快。"),
        /** 收招：8 − 速度偏移[−1,2]；夹 5..12。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "松口后的收势时间；速度越快收得越利落。"),
        /** 冷却：72 − 等级(≥25)偏移[0,20]；死咬 +8；夹 50..100。 */
        recharge: seconds(
            F.base(72).minus(F.level().minus(25).times(0.4).clamp(0, 20))
                .plus(F.when(F.pref("vise", text("worldcombat.skill.jawlock.preference.vise")), F.const(8), F.const(0)))
                .clamp(50, 100).round(0),
            "冷却", "再咬一次前的等待；等级越高越熟练，死咬式更费力。PP 10 的代价。")
    });

    defineDamage("jawlock", "chomp", {}, { contact: true, bite: true });

    stages("jawlock", [
        { level: 40, values: { chomp: 58, lockTicks: 300 } }
    ]);

    describe("jawlock", [
        { key: "description.0", values: ["chomp", "reach"] },
        { key: "description.1", values: ["lockTicks", "grip"] },
        { key: "description.2", values: ["lunge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["vise"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["vise"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chomp", "tier.0.lockTicks"] }
    ]);
}
