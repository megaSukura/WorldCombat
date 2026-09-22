/**
 * 潜灵奇袭 / phantomforce —— 参数与数值来源。
 *
 * 原生事实：Ghost、物理、威力 90、命中 100、PP 10、接触；第 1 回合消失在某处（期间免疫大多数招式），
 * 第 2 回合攻击，且无视守护（breaksProtect）（Cobblemon 1.8）。
 *
 * 世界化：即时战斗里没有回合，本实现把「两回合」翻成两拍——从原地撕开一道影子裂隙滑进去、短暂从世界上
 * 消失（看不出也打不着，但仍受时间与距离限制），再从目标身后的裂隙里现身，一刀劈下。它真正的身份是
 * 「无视守护」：现身那一刻会把目标身上的所有守护（GuardEffects 的池子——守住、看破、广域防守、硬化……
 * 都是同一套机制）一并震碎，所以它专治撑罩拖延的对手。裂隙带不走人：落点仍是目标本人，目标走开就扑空。
 *
 * 数值来源（每个参数读不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   rift         = 基础 90 + (物攻 − 70) × 0.28（夹 −16..40）；深潜式 ×0.85；等级台阶抬档。
 *   vanishTicks  = 基础 12 − (速度 − 55) × 0.05 刻（夹 −2..4）：速度快，滑进裂隙更快；深潜式 ×1.7。
 *   strikeRadius = 基础 0.55 + (碰撞箱高度 − 1.4) × 0.25 格：现身一刀的判定；体型越高大越宽。
 *   behindOffset = 基础 0.6 + 碰撞箱宽度 × 0.4 格：从目标身后几步处现身；身板越大退得越开。
 *   wardBreak    = 基础 1 + 每 20 级一级（向下取整，夹 1..3）：一次能震碎几层守护；深潜式 +1。
 *   tempo        = 基础 8 − (速度 − 55) × 0.03 刻；深潜式 +2。
 *   settle       = 基础 8 刻；深潜式 +3。
 *   recharge     = 基础 34 − (速度 − 55) × 0.12 刻；深潜式 +8。
 * 消失期间挂上真实的 `world_combat:phantomforce_veil`（共享身份 world_combat:status/phantomforce）与一层
 * 整段吸收的守护：看不出、也打不着；现身那一刻把目标身上的守护全部掀掉再结算这一刀。
 * 伤害段名 rift。
 */
namespace PokemonSkills {
    export const phantomforceId = "phantomforce";
    export const phantomforceScene = "world_combat:move_phantomforce";
    export const phantomforceVeil = "world_combat:phantomforce_veil";
    /** 消失期间那一层「穿过攻击」的守护规则名；现身时被震碎的也是这一类守护。 */
    export const phantomforceRule = "world_combat:phantomforce";
    export const phantomforceStrikeText = "world_combat.move.phantomforce.text.strike";
    export const phantomforcePierceText = "world_combat.move.phantomforce.text.pierce";
    export const phantomforceWhiffText = "world_combat.move.phantomforce.text.whiff";
    /** 表现里的参考半径：`data.scale = 现身判定半径 / 这个数`。 */
    export const phantomforceReferenceRadius = 0.55;

    actionParameters.define(phantomforceId, {
        /** 现身一刀的威力：90 + (物攻 − 70) × 0.28，夹 60..160；深潜式 ×0.85。 */
        rift: formula(
            F.base(90)
                .plus(F.stat("attack").minus(70).times(0.28).clamp(-16, 40))
                .times(F.when(F.pref("deep"), F.const(0.85), F.const(1)))
                .clamp(60, 160).round(1),
            "现身威力", {
                unit: "威力",
                description: "从裂隙里现身劈下的基础威力；物攻越高劈得越沉。深潜式在裂隙里停得更久，这一刀略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 消失时间：12 − (速度 − 55) × 0.05 刻，夹 5..24；深潜式 ×1.7。 */
        vanishTicks: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4))
                .times(F.when(F.pref("deep"), F.const(1.7), F.const(1)))
                .clamp(5, 24).round(0),
            "消失时间", "滑进裂隙到现身之间的时间；速度快滑得更快。深潜式停得更久——更安全，但对手有更多时间走位。"),
        /** 现身判定半径：0.55 + (碰撞箱高度 − 1.4) × 0.25 格，夹 0.4..1.1。 */
        strikeRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.25)).clamp(0.4, 1.1).round(2),
            "现身判定半径", {
                unit: "格",
                description: "现身一刀能劈到多大范围；身体越高大越宽。"
            }),
        /** 现身落位：0.6 + 碰撞箱宽度 × 0.4 格，夹 0.5..1.8。 */
        behindOffset: formula(
            F.base(0.6).plus(F.body("width").times(0.4)).clamp(0.5, 1.8).round(2),
            "现身落位", {
                unit: "格",
                description: "从目标身后多远的地方撕开裂隙现身；身板越大退得越开，也越不容易扑空。"
            }),
        /** 破护层数：1 + 每 20 级一级（向下取整），夹 1..3；深潜式 +1。 */
        wardBreak: formula(
            F.base(1).plus(F.level().div(20).floor())
                .plus(F.when(F.pref("deep"), F.const(1), F.const(0)))
                .clamp(1, 4).floor(),
            "破护层数", {
                unit: "层",
                description: "现身那一刻最多震碎目标身上几层守护；等级越高、深潜式破得越多。守护层不够时有多少破多少。"
            }),
        /** 起手：8 − (速度 − 55) × 0.03 刻，深潜式 +2，夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 3))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0))).clamp(5, 14).round(0),
            "起手", "撕开裂隙前聚影的时间；速度快的个体收得更急，深潜式先沉住一口气。"),
        /** 收招：8 刻，深潜式 +3，夹 5..16。 */
        settle: seconds(
            F.base(8).plus(F.when(F.pref("deep"), F.const(3), F.const(0))).clamp(5, 16).round(0),
            "收招", "现身劈完站定的时间；深潜式回魂更慢。"),
        /** 冷却：34 − (速度 − 55) × 0.12 刻，深潜式 +8，夹 20..55。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("deep"), F.const(8), F.const(0))).clamp(20, 55).round(0),
            "冷却", "两度潜入灵界之间的等待；速度快回得更快，深潜式更费。")
    });

    defineDamage(phantomforceId, "rift", {}, { contact: true });

    stages(phantomforceId, [
        { level: 32, values: { rift: 106 } },
        { level: 48, values: { rift: 122 } }
    ]);

    describe(phantomforceId, [
        { key: "description.0", values: ["rift"] },
        { key: "description.1", values: ["vanishTicks", "strikeRadius", "behindOffset"] },
        { key: "description.2", values: ["wardBreak"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rift"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rift"] }
    ]);
}
