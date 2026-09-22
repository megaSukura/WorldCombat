/**
 * 摇晃舞 / teeterdance 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 100、PP 20、目标 allAdjacent、
 *   附带 volatileStatus confusion；旗标 protect／mirror／dance。
 *
 * 世界化：把「摇摇晃晃地跳起舞蹈，让周围的宝可梦陷入混乱」翻成**一场把节奏推出去的舞**——
 *   施法者当场左右摇摆起来，舞圈内的每个活体（除自己）都被带进这个节奏，站不稳、走路会歪，
 *   出手也容易散。它不分敌我：连带盟友一起晃晕是它的代价，施法者自己反而不会中招。
 *   混乱沿用共享身份 world_combat:status/confusion，但行为由本单元自己的载体承担：别的作者做的混乱让人出手作废，
 *   这一支让人**摇晃走位**（周期性小位移）并附带少量失手。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   danceRadius 基础 2.5 格 + 碰撞箱高×0.5 + 等级×0.02，顾友 ×0.8，夹 2.5..6；身板越大、经验越多，舞圈越广。
 *   dazeTicks   基础 120 刻 + 等级×1.5 + 特攻×0.2，顾友 ×0.8，夹 90..320；这一晃在别人身上留多久。
 *   sway        基础 0.05 + 速度/2000 + 特攻/4000，夹 0.05..0.16；每 12 刻把人带偏多少格——它同时决定失手概率
 *               （约 sway 的 0.9 倍，5%..25%）。速度越快、特攻越高，舞步越难站稳。
 *   beats       基础 3 拍 + 等级/40，夹 3..5；舞摇几拍，表现按它一拍一拍铺开。
 *   motes       基础 20 点 + 特攻×0.1，夹 16..56；音符与光点数量，粒子按它发射。
 *   tempo       基础 12 刻 − 速度×0.05，顾友 +2，夹 6..16；起手。
 *   aftercast   基础 8 刻 + 碰撞箱高×1.2，夹 6..12；收招。
 *   recharge    基础 80 刻 − 等级×0.3，顾友 ×1.1，夹 45..110；冷却。PP 20 的代价。
 * 配置 careful（顾友）双向取舍：开启后不把友方带进节奏（盟友不会被晃晕），代价是半径 ×0.8、时长 ×0.8、起手 +2、冷却 ×1.1；
 *   关闭（尽兴）范围更大更久更便宜，但连带盟友一起摇晃。
 */
namespace PokemonSkills {
    export const teeterdanceId = "teeterdance";
    export const teeterdanceEffect = "world_combat:teeterdance_spin";
    export const teeterdanceScene = "world_combat:move_teeterdance";
    export const teeterdanceDazeText = "world_combat.move.teeterdance.text.daze";
    export const teeterdanceSteadyText = "world_combat.move.teeterdance.text.steady";
    /** 共享身份：这一舞带给别人的恍惚。 */
    export const teeterdanceStatus = "confusion";
    /** 摇晃间隔（刻）与由此派生的失手系数；skill.ts 的行为与说明同源。 */
    export const teeterdanceInterval = 12;
    export const teeterdanceFumbleFactor = 0.9;

    actionParameters.define(teeterdanceId, {
        danceRadius: formula(
            F.base(2.5).as("基础").plus(F.body("height").times(0.5).as("身板")).plus(F.level().times(0.02).as("经验"))
                .times(F.when(F.pref("careful", text("worldcombat.skill.teeterdance.preference.careful")), F.const(0.8), F.const(1)))
                .clamp(2.5, 6).round(2),
            "舞圈半径", {
                unit: " 格",
                description: "这一舞能把节奏推到多远；身板越大、经验越多越广，顾友式收窄。它就是指示圈与实际波及范围。"
            }),
        dazeTicks: seconds(
            F.base(120).as("基础").plus(F.level().times(1.5).as("等级")).plus(F.stat("specialAttack").times(0.2).as("特攻"))
                .times(F.when(F.pref("careful", text("worldcombat.skill.teeterdance.preference.careful")), F.const(0.8), F.const(1)))
                .clamp(90, 320).round(0),
            "恍惚时长", "被带进节奏的人要晃多久；等级与特攻越高留得越久，顾友式更短。"),
        sway: formula(
            F.base(0.05).as("基础").plus(F.stat("speed").div(2000).as("速度")).plus(F.stat("specialAttack").div(4000).as("特攻"))
                .clamp(0.05, 0.16).round(3),
            "摇晃强度", {
                unit: " 格",
                description: "每 12 刻把被带进节奏的人带偏多少格；速度与特攻越高越难站稳。它也决定失手概率（约 sway×0.9）。"
            }),
        beats: formula(
            F.base(3).plus(F.level().div(40).as("等级")).clamp(3, 5).round(0),
            "舞步拍数", {
                unit: " 拍",
                description: "这场舞摇几拍；等级越高越多，画面按它一拍一拍地铺开。"
            }),
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.1).as("特攻")).clamp(16, 56).round(0),
            "音符数量", {
                unit: " 点",
                description: "舞圈里翻飞的光点与音符数量；特攻越高越多，粒子按它发射。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.05).as("速度"))
                .plus(F.when(F.pref("careful", text("worldcombat.skill.teeterdance.preference.careful")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "起这一场舞需要多久；速度越快越短，顾友式多花 2 刻。"),
        aftercast: seconds(F.base(8).plus(F.body("height").times(1.2).as("身板")).clamp(6, 12).round(0), "收招",
            "舞毕收势；身板越大越慢。"),
        recharge: seconds(
            F.base(80).minus(F.level().times(0.3).as("等级"))
                .times(F.when(F.pref("careful", text("worldcombat.skill.teeterdance.preference.careful")), F.const(1.1), F.const(1)))
                .clamp(45, 110).round(0),
            "冷却", "两场舞之间的等待；等级越高越短，顾友式更长。PP 20 的代价。")
    });

    describe(teeterdanceId, [
        { key: "description.0", values: ["danceRadius", "dazeTicks"] },
        { key: "careful.on", values: [], when: function (context) { return read(context.detail.values, ["careful"]) === true; } },
        { key: "careful.off", values: [], when: function (context) { return read(context.detail.values, ["careful"]) !== true; } },
        { key: "description.1", values: ["sway", "beats", "motes"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
