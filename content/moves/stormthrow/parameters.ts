/**
 * 山岚摔 / stormthrow —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：格斗／物理／威力 60／命中 100／PP 10／接触／willCrit（必定击中要害）／
 *   无次要效果（isNonstandard: Past）。描述是「向对手使出强烈的一击。攻击必定会击中要害。」
 *
 * 翻译：把「必定击中要害」落成一次**贴身的摔投**——抓住对手、借它的冲势把它整个人掀翻砸在地上；
 *   正面站桩打不出这种角度，只有把对手摔到无法卸力的姿态，才每一记都砸在薄弱处。它是本组唯一的近身擒摔：
 *   只对一个目标、必须贴身（抓取距离 2.6 格起），摔实了按物理结算一次**必定要害**的伤害，
 *   并把对手掀翻在地（共享身份 stagger，行为由本单元写：暂时无法开始新动作、移动变慢），落点砸出翻起的碎土。
 *   与巴投分开：巴投把对手从头顶摔到背后并逐出交战圈；山岚摔是把对手就地掀翻、压住一个身位。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   slam         摔击威力：物攻给出摔劲，等级补熟练；锁摔把力量让给控制。
 *   reach        抓取距离：物攻决定手能够到多远。
 *   crush        下砸距离：体重决定能把对手砸得多沉。
 *   staggerTicks 摔翻时长：等级决定压多久；锁摔更久。
 *   scar/scarTicks 碎土格数与停留：物攻决定砸翻多少格，等级决定留多久；锁摔更大。
 *   dust         尘土数量：物攻派生，驱动画面密度。
 *   tempo/aftercast/recharge 速度决定节奏；锁摔更慢更费。
 *
 * 配置 `pin`（锁摔）双向取舍：开启＝摔翻时长 ×1.4、碎土更大、起手 +2 刻、冷却 +8 刻，但威力 ×0.9
 *   （压住一个身位 vs 一记更狠的伤害）。关闭（急摔）＝威力 ×1.12、摔翻更短、更快更省。两个方向各有适用局面。
 *
 * 伤害段 `slam`：这一摔随精灵数据变化的那部分威力；命中必定要害，命中时按共享要害倍率结算。
 */
namespace PokemonSkills {
    export const stormthrowId = "stormthrow";
    export const stormthrowScene = "world_combat:move_stormthrow";
    export const stormthrowStaggerEffect = "world_combat:stormthrow_stagger";
    export const stormthrowStaggerText = "world_combat.move.stormthrow.text.stagger";
    export const stormthrowMissText = "world_combat.move.stormthrow.text.miss";

    actionParameters.define(stormthrowId, {
        /** 摔击威力：52 + 物攻偏移[−10,30] + 等级(≥20)偏移[0,8]，锁摔 ×0.9、急摔 ×1.12；夹 36..104。 */
        slam: formula(
            F.base(52, "基础")
                .plus(F.stat("attack").minus(55).times(0.3).clamp(-10, 30).as("物攻"))
                .plus(F.level().minus(20).times(0.3).clamp(0, 8).as("等级"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(0.9), F.const(1.12)).as("摔法"))
                .clamp(36, 104).round(1),
            "摔击威力", {
                unit: "威力",
                description: "这一摔随精灵数据变化的那部分：物攻给出摔劲，等级给出熟练度。命中必定要害（×1.5）。对手防御、相性在命中时另算。"
            }),
        /** 抓取距离：2.6 + 物攻偏移[−0.3,0.7]；夹 2.3..3.8。 */
        reach: formula(
            F.base(2.6, "基础")
                .plus(F.stat("attack").minus(55).times(0.01).clamp(-0.3, 0.7).as("物攻"))
                .clamp(2.3, 3.8).round(2),
            "抓取距离", {
                unit: "格",
                description: "要贴身到这个距离才抓得住对手；手劲大的够得稍远。它也是本招的实际射程。"
            }),
        /** 下砸距离：0.5 + 体重偏移[−0.1,0.4]；夹 0.3..1.2。 */
        crush: formula(
            F.base(0.5, "基础")
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.4).as("体重"))
                .clamp(0.3, 1.2).round(2),
            "下砸距离", {
                unit: "格",
                description: "把对手朝地面与前方砸下去多远；身子越重的个体压得越沉，对手更难立刻起身。"
            }),
        /** 摔翻时长：24 + 等级(≥20)偏移[0,16]，锁摔 ×1.4，急摔 ×0.8；夹 18..60。 */
        staggerTicks: seconds(
            F.base(24, "基础")
                .plus(F.level().minus(20).times(0.5).clamp(0, 16).as("等级"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(1.4), F.const(0.8)).as("摔法"))
                .clamp(18, 60).round(0),
            "摔翻时长", "被摔翻的人在这段时间内无法开始新动作、移动明显变慢；伤害阶段不受影响，仍可被打。等级越高压得越久，锁摔更久。"),
        /** 碎土格数：6 + 物攻偏移[0,10]，锁摔 ×1.2；夹 4..20。 */
        scar: formula(
            F.base(6, "基础")
                .plus(F.stat("attack").minus(55).times(0.08).clamp(0, 10).as("物攻"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(1.2), F.const(1)).as("摔法"))
                .clamp(4, 20).round(0),
            "碎土格数", {
                unit: "块",
                description: "落点被砸翻多少格地面；物攻越高砸得越开。它同时驱动画面里翻起的土块数量。"
            }),
        /** 碎土停留：100 + 等级 ×2；夹 60..240。 */
        scarTicks: seconds(
            F.base(100, "基础").plus(F.level().times(2)).clamp(60, 240).round(0),
            "碎土停留", "砸翻的地面停留多久；等级越高留得越久。到期原方块回来。"),
        /** 尘土数量：16 + 物攻偏移[0,20]；夹 12..44。 */
        dust: formula(
            F.base(16, "基础")
                .plus(F.stat("attack").minus(55).times(0.2).clamp(0, 20).as("物攻"))
                .clamp(12, 44).round(0),
            "尘土数量", {
                unit: "点",
                description: "摔实那一瞬扬起的尘土数量，随物攻增长；粒子按它发射。"
            }),
        /** 起手：10 − 速度偏移[−2,3]，锁摔 +2；夹 6..16。 */
        tempo: seconds(
            F.base(10, "基础")
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3).as("速度"))
                .plus(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(2), F.const(0)).as("摔法"))
                .clamp(6, 16).round(0),
            "起手", "沉身、抓腕、借势的整套准备要多久；速度越快起得越短，锁摔多稳一下。"),
        /** 收招：9 − 速度偏移[−1.5,2]；夹 5..13。 */
        aftercast: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2).as("速度")).clamp(5, 13).round(0),
            "收招", "摔完站稳的时间；快的个体收得干脆。"),
        /** 冷却：60 − 等级 ×0.4，锁摔 +8；夹 40..100。 */
        recharge: seconds(
            F.base(60, "基础")
                .minus(F.level().times(0.4))
                .plus(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(8), F.const(0)).as("摔法"))
                .clamp(40, 100).round(0),
            "冷却", "两次山岚摔之间的等待；等级越高越熟练，锁摔更费。PP 10 的代价。")
    });

    defineDamage(stormthrowId, "slam", { defenceCoefficient: 0.005, rationale: "近身摔投按默认防御系数减伤，突出物攻与体重的差别。" }, { contact: true });

    stages(stormthrowId, [
        { level: 28, values: { slam: 64, crush: 0.7 } },
        { level: 44, values: { slam: 78, staggerTicks: 34, scar: 10 } }
    ]);

    describe(stormthrowId, [
        { key: "description.0", values: ["slam","reach"] },
        { key: "description.1", values: ["staggerTicks","crush"] },
        { key: "description.2", values: ["scar", "scarTicks"] },
        { key: "pin.on", values: [], when: function (context) { return read(context.detail.values, ["pin"]) === true; } },
        { key: "pin.off", values: [], when: function (context) { return read(context.detail.values, ["pin"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slam", "tier.1.staggerTicks", "tier.1.scar"] }
    ]);
}
