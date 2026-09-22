/**
 * 撒娇 / Charm 的参数与数值来源。
 *
 * 原生：Fairy／Status／威力 —／命中 100／PP 20／目标 normal（单体）／boosts={atk:-2}（大幅降低攻击）／
 *       flags 含 protect、reflectable、mirror、allyanim（需要有形）。
 * 世界化：不是隔空扣等级，而是**凑近一个对手，把它的战意拖进心软里**。目光要落在对方身上，
 *   所以它需要通视、只认一个目标；命中后先挂共享身份 world_combat:status/charmed 的真实 MobEffect，
 *   再调用 NativeEffects.boost 大幅下降攻击：宝可梦损失原生攻击等级，其他生物落到攻击属性。
 * 两种送法各有一面：贴近撒娇要凑得很近，但卸 2 级、留得久；飞吻够得更远，但只卸 1 级、留得短、起手与冷却更长。
 *   掩体与距离是它天然的空门。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop         贴近 2 级／飞吻 1 级；夹 1..2。送法决定深度。
 *   charmRange   身高 × 1.1 + 4.5（飞吻）夹 5..9；身高 × 0.5 + 1.2（贴近）夹 1.6..3.0；身量越高够得越远。
 *   heartTicks   120 + 亲密度 × 1.2，贴近 ×1.3／飞吻 ×0.7，夹 80..320；越亲近越能把这份心软留住。
 *   hearts       14 + (特攻 − 60) × 0.22，夹 12..40；心神越盛的施法者一次洒出的心越多（也是画面里的数量）。
 *   tempo        速度 ÷ 9 + 4，飞吻 +3，夹 5..15；速度越快越早抬眼。
 *   recharge     130 + (等级 − 30) × 0.8，飞吻 +30，夹 110..220；等级越高越熟练，飞吻更费力。
 */
namespace PokemonSkills {
    export const charmId = "charm";
    export const charmEffect = "world_combat:charm_heart";
    export const charmScene = "world_combat:move_charm";
    export const charmSpot = "world_combat:status/charmed";

    actionParameters.define(charmId, {
        drop: formula(
            F.when(F.pref("kiss", text("worldcombat.skill.charm.preference.kiss")), F.const(1), F.const(2)).clamp(1, 2).round(0),
            "攻击下降", {
                unit: " 级",
                description: "被撒娇者损失的攻击等级；贴近撒娇卸 2 级，飞吻只卸 1 级。"
            }),
        charmRange: formula(
            F.when(F.pref("kiss", text("worldcombat.skill.charm.preference.kiss")),
                F.body("height").times(1.1).plus(4.5).clamp(5, 9),
                F.body("height").times(0.5).plus(1.2).clamp(1.6, 3.0)).round(1),
            "撒娇距离", {
                unit: " 格",
                description: "撒娇能被看见、能被送到的距离；施法者身形越高够得越远，飞吻明显更远。"
            }),
        heartTicks: seconds(
            F.base(120).plus(F.individual("friendship").times(1.2))
                .times(F.when(F.pref("kiss", text("worldcombat.skill.charm.preference.kiss")), F.const(0.7), F.const(1.3)))
                .clamp(80, 320).round(0),
            "心软时长", "对方下不去手多久；施法者越亲近留得越久，飞吻更短。"),
        hearts: formula(
            F.base(14).plus(F.stat("specialAttack").minus(60).max(0).times(0.22)).clamp(12, 40).round(0),
            "爱心量", {
                unit: " 颗",
                description: "一次撒娇洒出的爱心数量；心神越盛的施法者越多，画面里的心也按它画出。"
            }),
        tempo: seconds(
            F.stat("speed").div(9).plus(4)
                .plus(F.when(F.pref("kiss", text("worldcombat.skill.charm.preference.kiss")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "抬眼撒娇需要多久；速度越快越早，飞吻要多花几刻。"),
        recharge: seconds(
            F.base(130).plus(F.level().minus(30).max(0).times(0.8))
                .plus(F.when(F.pref("kiss", text("worldcombat.skill.charm.preference.kiss")), F.const(30), F.const(0)))
                .clamp(110, 220).round(0),
            "冷却", "两次撒娇之间的等待；等级越高越熟练，飞吻更费力。")
    });

    describe(charmId, [
        { key: "description.0", values: ["drop", "heartTicks"] },
        { key: "description.1", values: ["charmRange", "hearts"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "kiss.off", values: [], when: function (context) { return read(context.detail.values, ["kiss"]) !== true; } },
        { key: "kiss.on", values: [], when: function (context) { return read(context.detail.values, ["kiss"]) === true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
