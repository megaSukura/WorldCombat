/**
 * 泼沙 / Sand Attack 的参数与数值来源。
 *
 * 原生：Ground／Status／威力 —／命中 100／PP 15／目标 normal（单体）／boosts={accuracy:-1}。
 * 世界化：不隔空扣等级，而是**用脚下一把东西糊对手的脸**——以施法者为顶点朝目标铺开一片扇形砂砾，
 *   站在扇面里的敌人一起被糊；砂砾取自脚下真实的地面（沙、红沙、砂砾、泥土、灵魂沙……），颜色跟着
 *   那块方块走，所以这招在不同的地方长得不一样。扇面很短，走出扇面、绕到侧面或躲到掩体后就能让开。
 *   被糊到的人先挂共享身份 world_combat:status/sanded 的真实 MobEffect（攻击变弱），宝可梦那一层再
 *   调用 NativeEffects.boost 下降原生命中等级；粗砂（粗粝）与细沙（细腻）在覆盖与深度之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   blindStage  攻击每 75 点升一级，基础 1 级，夹 1..2；力气越大，扬起的沙越能糊住整张脸。
 *   coneAngle   48 + (宽度 − 0.9) × 26 度，夹 40..82；体型越宽，踢出的扇面越开。
 *   coneRange   3.5 + (等级 − 20) × 0.02 格，夹 3..5.5；等级越高踢得越远（这是全族最短的射程）。
 *   duration    80 + 体重 ÷ 4 刻，夹 80..200；越重的个体扬起的沙越厚，糊在脸上更久。
 *   grains      身高 × 18 + 16，夹 24..70；身形越高，画面里的沙粒越多。
 *   tempo       速度 ÷ 8 + 3 刻，夹 4..10；速度越快踢得越干脆。
 *   recharge    70 + (等级 − 20) × 0.5 刻，夹 60..110；等级越高越熟练。
 */
namespace PokemonSkills {
    export const sandattackId = "sandattack";
    export const sandattackEffect = "world_combat:sand_blinded";
    export const sandattackScene = "world_combat:move_sandattack";
    export const sandattackSpot = "world_combat:status/sanded";

    actionParameters.define(sandattackId, {
        blindStage: formula(F.stat("attack").minus(60).max(0).div(75).plus(1).clamp(1, 2).round(0), "糊眼级数", {
            unit: " 级",
            description: "目标在宝可梦那一层损失的原生命中等级；攻击每 75 点升一级，最多两级。"
        }),
        coneAngle: formula(F.body("width").minus(0.9).times(26).plus(48).clamp(40, 82).round(0), "扇面角度", {
            unit: " 度",
            description: "踢出的砂砾扇面总张角；体型越宽，扇面越开，越容易罩住侧面的人。"
        }),
        coneRange: formula(F.base(3.5).plus(F.level().minus(20).max(0).times(0.02)).clamp(3, 5.5).round(1), "扇面长度", {
            unit: " 格",
            description: "砂砾能扫到多远；等级越高踢得越远。这是全族最短的射程，想糊脸就得靠近。"
        }),
        duration: seconds(F.base(80).plus(F.body("weight").div(4)).clamp(80, 200).round(0), "糊眼时长",
            "砂砾留在眼里多久；体重越大扬起的沙越厚，糊得更久。"),
        grains: formula(F.body("height").times(18).plus(16).clamp(24, 70).round(0), "沙粒数量", {
            unit: " 粒",
            description: "一次扬起的砂砾数量，画面里数得出来；身形越高越多。"
        }),
        tempo: seconds(F.stat("speed").div(8).plus(3).clamp(4, 10).round(0), "起手",
            "刨起脚下一把东西需要多久；速度越快越干脆。"),
        recharge: seconds(F.base(70).plus(F.level().minus(20).max(0).times(0.5)).clamp(60, 110).round(0), "冷却",
            "两次泼沙之间的等待；等级越高越熟练。")
    });
    describe(sandattackId, [
        { key: "description.0", values: ["blindStage", "duration"] },
        { key: "description.1", values: ["coneRange", "coneAngle", "grains"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
