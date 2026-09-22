/**
 * 输电 / Electrify — 参数与数值来源。
 *
 * 原生：Electric／Status／PP 20／命中必中／单体；volatileStatus electrify，持续 1 回合：
 *       目标这一次使出的招式变成电属性（struggle 除外）。
 * 世界化：一把电直接灌进对手身体，给它下一次出招「通电」——那一招在结算前变成电属性，落地后电荷爆开消失。
 *         于是它可以把对手的普通招变成电招（被地面免疫、被电吸收特性吃掉），也可以抹掉对手的属性和本系加成。
 *         对自己人、原版生物、其他模组生物同样可用；它是预判式干扰，命中不掷骰，但会被拖过时间或用错误的一招浪费掉。
 *
 * 数值来源（都来自个体，分散在不同参数上）：
 *   surgeDuration  基础 160 刻 + 等级×4 刻，再乘导法系数，限幅 100~420
 *   arcCount       基础 6 + 特攻/18，限幅 4~14：输电瞬间电弧的条数
 *   dischargeRadius 基础 0.7 格 + 体重每 250 单位 +1 格（最多 +0.8）：电荷爆开的范围
 *   sparkSpeed     基础 0.14 格/刻 + 速度/900（最多 +0.2）：电弧爬向目标的快慢
 * 配置项 allMoves 在“全导（把任何招式都变成电，更强但更短更贵）”和“滤波（只把一般属性招式变电，更久更便宜）”之间取舍。
 */
namespace PokemonSkills {
    export const electrifyScene = "world_combat:move_electrify";
    export const electrified = "world_combat:electrified";
    export const electrifyPayload = "world_combat:electrify_payload";
    export const electrifyText = "world_combat.move.electrify.text.charge";
    export const electrifySpentText = "world_combat.move.electrify.text.spent";
    function electrifyAllMoves(detail: any): boolean { return !!(detail && detail.values && detail.values.allMoves); }

    actionParameters.define("electrify", {
        surgeDuration: seconds(F.base(160, "通电持续")
            .plus(F.level().times(4).as("等级"))
            .times(F.when(F.pref("allMoves"), F.const(0.75), F.const(1.25)).as("导法"))
            .clamp(100, 420),
            "通电持续", "目标下一次出招前，电荷能挂多久；全导 -25%、滤波 +25%，并随等级延长。"),
        arcCount: formula(F.base(6, "电弧条数")
            .plus(F.stat("specialAttack").div(18).as("特攻"))
            .clamp(4, 14).round(),
            "电弧条数", { unit: " 条", description: "输电瞬间爬向目标的电弧条数；特攻越高电弧越密。" }),
        dischargeRadius: formula(F.base(0.7, "爆开半径")
            .plus(F.body("weight").div(10).max(0).div(250).min(0.8).as("体重")),
            "爆开半径", { unit: " 格", description: "输掉的电在目标出招命中时爆开的半径；体重越大炸得越开。" }),
        sparkSpeed: formula(F.base(0.14, "电弧速度")
            .plus(F.stat("speed").div(900).min(0.2).as("速度")),
            "电弧速度", { unit: " 格/刻", description: "电弧爬向目标的快慢；速度越高爬得越快。" })
    });

    stages("electrify", [{ level: 30, values: { cooldown: 52 } }, { level: 50, values: { cooldown: 44 } }]);
    describe("electrify", [
        { key: "description.0", values: ["surgeDuration"] },
        { key: "description.1", values: ["arcCount", "dischargeRadius", "sparkSpeed"] },
        { key: "allmoves.0", values: [], when: function (context) { return electrifyAllMoves(context.detail); } },
        { key: "allmoves.1", values: [], when: function (context) { return !electrifyAllMoves(context.detail); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
