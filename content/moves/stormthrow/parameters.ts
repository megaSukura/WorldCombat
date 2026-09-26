/** One native critical strike with finite rear-flank movement and dust drawn from actual positions. */
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
        /** 侧后行程：0.5 + 体重偏移[−0.1,0.4]；夹 0.3..1.2。 */
        crush: formula(
            F.base(0.5, "基础")
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.4).as("体重"))
                .clamp(0.3, 1.2).round(2),
            "侧后行程", {
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
        /** 轨迹尘纹：6 + 物攻偏移[0,10]，锁摔 ×1.2；夹 4..20。 */
        scar: formula(
            F.base(6, "基础")
                .plus(F.stat("attack").minus(55).times(0.08).clamp(0, 10).as("物攻"))
                .times(F.when(F.pref("pin", text("worldcombat.skill.stormthrow.preference.pin")), F.const(1.2), F.const(1)).as("摔法"))
                .clamp(4, 20).round(0),
            "轨迹尘纹", {
                unit: "道",
                description: "实际旋身路径上的尘纹数量，随物攻与锁摔配置改变。"
            }),
        /** 碎土停留：100 + 等级 ×2；夹 60..240。 */
        scarTicks: seconds(
            F.base(10, "基础").plus(F.level().times(.4)).clamp(12, 40).round(0),
            "余尘时长", "真实落点余尘的表现时长；等级越高略持久。"),
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
        { key: "description.2", values: [] },
        { key: "pin.on", values: [], when: function (context) { return read(context.detail.values, ["pin"]) === true; } },
        { key: "pin.off", values: [], when: function (context) { return read(context.detail.values, ["pin"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.slam","tier.1.staggerTicks"] }
    ]);
}
