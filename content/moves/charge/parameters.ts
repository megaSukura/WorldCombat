/**
 * 充电 / Charge — 参数与数值来源。
 *
 * 原生：Electric／Status／PP 20／命中必中／自己；boosts spd +1，volatileStatus charge：
 *       下一次电属性招式的威力翻倍，用掉后电荷消失（native 在 onAfterMove 移除，且用 charge 本身不消耗）。
 * 世界化：把周围电荷收进身体（起手可见电弧内聚），随后身上挂一层「充能」：特防 +1 级，并且下一次电属性
 *         招式的威力翻倍——命中那一刻电荷从身上炸开（放电）用掉。电荷也会随时间自行散去（自散）或被人解除。
 *         两种结束方式通向不同的画面：放电是炸开，自散是安静褪去。
 *
 * 数值来源（都来自个体，分散在不同参数上）：
 *   chargeDuration  基础 300 刻 + 等级×4 刻 + 特防超出 50 的部分×2 刻，再乘蓄电方式系数，限幅 160~900
 *   auraRadius      基础 0.5 格 + 体重每 600 单位 +1 格（最多 +0.4）：越重的个体电晕越厚
 *   sparkCount      基础 20 + 特攻/8 + 等级/4，限幅 12~60：特攻越高聚起的电花越多
 *   dischargeRadius 基础 0.7 格 + 体重每 250 单位 +1 格（最多 +0.8）：放电炸开的范围
 *   sparkSpeed      基础 0.12 格/刻 + 速度/900，最多 +0.18：越快的个体电荷收得越急
 * 配置项 hold 在“蓄满（更久、更贵）”和“即用（更短、更便宜）”之间取舍。
 * 核心倍率固定按原生：下一次电属性招式威力 ×2、特防 +1 级；其余数值全部随精灵数据变化。
 */
namespace PokemonSkills {
    export const chargeScene = "world_combat:move_charge";
    export const chargeUp = "world_combat:charge_up";
    export const chargeMark = "world_combat:charge_mark";
    export const chargeReadyText = "world_combat.move.charge.text.ready";
    export const chargeSpentText = "world_combat.move.charge.text.spent";
    export const chargeFadeText = "world_combat.move.charge.text.fade";
    function chargeHeld(detail: any): boolean { return !!(detail && detail.values && detail.values.hold); }

    actionParameters.define("charge", {
        chargeDuration: seconds(F.base(300, "充能持续")
            .plus(F.level().times(4).as("等级"))
            .plus(F.stat("specialDefence").minus(50).max(0).times(2).as("特防"))
            .times(F.when(F.pref("hold"), F.const(1.6), F.const(0.75)).as("蓄电方式"))
            .clamp(160, 900),
            "充能持续", "充能状态能挂多久；蓄满 +60%，即用 -25%，并随等级与特防延长。"),
        auraRadius: formula(F.base(0.5, "电晕半径")
            .plus(F.body("weight").div(10).max(0).div(600).min(0.4).as("体重")),
            "电晕半径", { unit: " 格", description: "充能期间身上电弧张开的半径；体重越大电晕越厚。" }),
        sparkCount: formula(F.base(20, "聚电数量")
            .plus(F.stat("specialAttack").div(8).as("特攻"))
            .plus(F.level().div(4).as("等级"))
            .clamp(12, 60).round(),
            "聚电数量", { unit: " 点", description: "起手聚电与持续电弧的粒子量；特攻与等级越高电花越多。" }),
        dischargeRadius: formula(F.base(0.7, "放电半径")
            .plus(F.body("weight").div(10).max(0).div(250).min(0.8).as("体重")),
            "放电半径", { unit: " 格", description: "电招命中、电荷用掉时从身上炸开的半径；体重越大炸得越开。" }),
        sparkSpeed: formula(F.base(0.12, "聚电速度")
            .plus(F.stat("speed").div(900).min(0.18).as("速度")),
            "聚电速度", { unit: " 格/刻", description: "电荷收进身体的速度；速度越高收得越急。" })
    });

    stages("charge", [{ level: 30, values: { cooldown: 58 } }, { level: 50, values: { cooldown: 48 } }]);
    describe("charge", [
        { key: "description.0", values: ["chargeDuration"] },
        { key: "description.1", values: ["sparkCount", "auraRadius", "dischargeRadius", "sparkSpeed"] },
        { key: "hold.0", values: [], when: function (context) { return chargeHeld(context.detail); } },
        { key: "hold.1", values: [], when: function (context) { return !chargeHeld(context.detail); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
