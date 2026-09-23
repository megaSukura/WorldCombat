/**
 * 闪光 / Flash 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 normal（单体）／boosts={accuracy:-1}。
 * 世界化：这不是隔空扣一级命中，而是**一次真正的爆闪**——施法者自身炸开一团强光，凡是看得见这道光的
 *   敌人当场被晃花眼睛。光不走路，所以走位躲不开；但它被掩体挡住，墙后、柱子后就照不到——这是这招
 *   唯一的空门，也是对手能读出来的东西。离光源越近，晃得越深：远端的对手只掉一级。
 *   被晃到的人先挂共享身份 world_combat:status/dazzled 的真实 MobEffect（攻击变弱），宝可梦那一层再调用
 *   NativeEffects.boost 下降原生命中等级；光势（散射/聚光）在覆盖面与深度之间取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   blindStage  特攻每 70 点升一级，基础 1 级，夹 1..2；特攻越强，闪出的光越刺眼。
 *   radius      4 + (特攻 − 50) × 0.025 格，夹 4..8；另有 50 级台阶 +1；特攻越高、等级越高，光铺得越远。
 *   duration    100 + (等级 − 20) × 2.5 刻，夹 100..220；经验越足，晃花的后劲留得越久。
 *   afterimage  20 + 特攻 ÷ 6，夹 20..70；画面里残留的光点数，随特攻变多。
 *   tempo       速度 ÷ 7 + 4 刻，夹 5..12；速度越快越早炸亮。
 *   recharge    140 + (等级 − 20) × 1.2 刻，夹 120..220；等级越高越熟练，冷却略短。
 */
namespace PokemonSkills {
    export const flashId = "flash";
    export const flashEffect = "world_combat:flash_dazzled";
    export const flashScene = "world_combat:move_flash";
    export const flashSpot = "world_combat:status/dazzled";

    actionParameters.define(flashId, {
        blindStage: formula(F.stat("specialAttack").minus(70).max(0).div(70).plus(1).clamp(1, 2).round(0), "晃眼级数", {
            unit: " 级",
            description: "目标在宝可梦那一层损失的原生命中等级；特攻每 70 点升一级，最多两级。"
        }),
        radius: formula(F.base(4).plus(F.stat("specialAttack").minus(50).max(0).times(0.025)).clamp(4, 8).round(1), "闪光半径", {
            unit: " 格",
            description: "强光能照到多远；特攻越高光越亮、铺得越远，等级台阶再把它抬高一级。"
        }),
        duration: seconds(F.base(100).plus(F.level().minus(20).max(0).times(2.5)).clamp(100, 220).round(0), "晃眼时长",
            "被晃到的目标多久缓不过来；等级越高后劲越足。"),
        afterimage: formula(F.base(20).plus(F.stat("specialAttack").div(6)).clamp(20, 70).round(0), "余光数量", {
            unit: " 点",
            description: "目标眼前残留的光点数；特攻越高，画面里拖的余光越多。"
        }),
        tempo: seconds(F.stat("speed").div(7).plus(4).clamp(5, 12).round(0), "起手",
            "聚起这道光需要多久；速度越快，越早炸亮。"),
        recharge: seconds(F.base(140).plus(F.level().minus(20).max(0).times(1.2)).clamp(120, 220).round(0), "冷却",
            "两次闪光之间的等待；等级越高越熟练。")
    });
    stages(flashId, [
        { level: 50, values: { radius: 5 } },
        { level: 65, values: { radius: 6 } }
    ]);
    describe(flashId, [
        { key: "description.0", values: ["blindStage","duration"] },
        { key: "description.1", values: ["radius"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
