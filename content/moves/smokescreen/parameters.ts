/**
 * 烟幕 / Smokescreen 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 normal（单体）／boosts={accuracy:-1}。
 * 世界化：不隔空扣等级，而是**朝一个地点吐出一团会停留的烟**。烟落地摊开成一片低垂的云，谁站在里面
 *   谁就打不准——而且云留在那里，可以铺在对手脚下，也可以铺在自己身前挡住视线、换一口气。这是全族
 *   唯一会留在世界上、会影响后来者的成员：云有存在时长，走进去就中、走出来还带着余味。
 *   云里的人先挂共享身份 world_combat:status/smoked 的真实 MobEffect（攻击变弱），宝可梦那一层再调用
 *   NativeEffects.boost 下降原生命中等级；「浓烟／薄烟」在覆盖与持久之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   blindStage   特攻每 90 点升一级，基础 1 级，夹 1..2；特攻越强，喷出的烟越呛眼。
 *   cloudRadius  1.8 + 宽度 × 0.7 格，夹 1.6..3.4；体型越宽，吐出的烟团摊得越大。
 *   cloudTicks   100 + (等级 − 30) × 2.5 刻，夹 100..260；等级越高，烟留得越久。
 *   lingerTicks  70 + (特攻 − 60) × 0.6 刻，夹 70..160；走出云后余味持续多久，特攻越强越缠绵。
 *   smokeSpeed   0.9 + (速度 − 50) × 0.006 格/刻，夹 0.8..1.4；速度越快，烟团扑到落点越急。
 *   density      30 + 体重 ÷ 6，夹 30..80；体重越大吐得越多，画面里的烟越密。
 *   tempo        速度 ÷ 7 + 4 刻，夹 6..14；速度越快越早吐烟。
 *   recharge     90 + (等级 − 30) × 1.5 刻，夹 90..180；等级越高越熟练。
 */
namespace PokemonSkills {
    export const smokescreenId = "smokescreen";
    export const smokescreenEffect = "world_combat:smoke_obscured";
    export const smokescreenScene = "world_combat:move_smokescreen";
    export const smokescreenSpot = "world_combat:status/smoked";
    export const smokescreenField = "world_combat:field/smokescreen";

    actionParameters.define(smokescreenId, {
        reach: formula(F.base(7).plus(F.level().minus(30).max(0).times(0.06)).clamp(6, 10).round(1), "喷烟距离", {
            unit: " 格",
            description: "烟团能送到的最远点；等级越高够得越远。"
        }),
        blindStage: formula(F.stat("specialAttack").minus(80).max(0).div(90).plus(1).clamp(1, 2).round(0), "呛眼级数", {
            unit: " 级",
            description: "云里的人在宝可梦那一层损失的原生命中等级；特攻每 90 点升一级，最多两级。"
        }),
        cloudRadius: formula(F.base(1.8).plus(F.body("width").times(0.7)).clamp(1.6, 3.4).round(2), "烟云半径", {
            unit: " 格",
            description: "烟团落地后在地面上的覆盖半径；体型越宽摊得越大。"
        }),
        cloudTicks: seconds(F.base(100).plus(F.level().minus(30).max(0).times(2.5)).clamp(100, 260).round(0), "烟云时长",
            "一片烟云在世界上停留多久；等级越高留得越久。"),
        lingerTicks: seconds(F.base(70).plus(F.stat("specialAttack").minus(60).max(0).times(0.6)).clamp(70, 160).round(0), "余味时长",
            "走出烟云后呛眼还持续多久；特攻越强，余味越缠绵。"),
        smokeSpeed: formula(F.base(0.9).plus(F.stat("speed").minus(50).max(0).times(0.006)).clamp(0.8, 1.4), "喷烟速度", {
            unit: " 格/刻",
            description: "烟团从口边扑到落点的速度；速度越快越急，也越难在铺好前改主意。"
        }),
        density: formula(F.base(30).plus(F.body("weight").div(6)).clamp(30, 80).round(0), "烟浓度", {
            unit: " 股",
            description: "画面里同时飘出的烟量；体重越大吐得越多。"
        }),
        tempo: seconds(F.stat("speed").div(7).plus(4).clamp(6, 14).round(0), "起手",
            "把这口烟攒到嘴边需要多久；速度越快越早吐出。"),
        recharge: seconds(F.base(90).plus(F.level().minus(30).max(0).times(1.5)).clamp(90, 180).round(0), "冷却",
            "两次喷烟之间的等待；等级越高越熟练。")
    });
    describe(smokescreenId, [
        { key: "description.0", values: ["blindStage","lingerTicks"] },
        { key: "description.1", values: ["cloudRadius","cloudTicks"] },
        { key: "description.2", values: ["reach","smokeSpeed","tempo","recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
