/** batonpass：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const batonpassId = "batonpass";
    export const batonpassScene = "world_combat:move_batonpass";
    export const batonpassEffect = "world_combat:baton_pass";
    export const batonpassStatus = "baton_pass";
    export const batonpassText = "world_combat.move.batonpass.text.handoff";
    export const batonpassLoneText = "world_combat.move.batonpass.text.lone";
    export const batonpassStats = ["atk", "def", "spa", "spd", "spe"];

    actionParameters.define(batonpassId, {
        /** 接力级数：2 + 亲密度 ÷ 60，接力式 ×1.0／独走式 ×0.65；夹 2..6。 */
        carry: formula(
            F.base(2).plus(F.individual("friendship").div(60))
                .times(F.when(F.pref("relay", text("worldcombat.skill.batonpass.preference.relay")), F.const(1), F.const(0.65)))
                .clamp(2, 6).round(0),
            "接力级数", {
                unit: " 级",
                description: "这根棒最多能带走几级能力变化；越亲近的伙伴越肯把全部家底交出去，独走式只交一部分。"
            }),
        /** 递棒距离：5 +（等级 − 30）×0.05 [−0.5,2]；夹 4..9。 */
        handoffRange: formula(
            F.base(5).plus(F.level().minus(30).times(0.05).clamp(-0.5, 2)).clamp(4, 9).round(2),
            "递棒距离", {
                unit: " 格",
                description: "伙伴要站在这个距离以内才接得住棒；它也是本招的实际射程与指示圈半径。等级越高伸得越远。"
            }),
        /** 退步距离：3 +（速度 − 50）×0.02 [−0.4,1.2]；接力式 ×0.6／独走式 ×1.2；夹 1.5..6。 */
        withdraw: formula(
            F.base(3).plus(F.stat("speed").minus(50).times(0.02).clamp(-0.4, 1.2))
                .times(F.when(F.pref("relay", text("worldcombat.skill.batonpass.preference.relay")), F.const(0.6), F.const(1.2)))
                .clamp(1.5, 6).round(2),
            "退步距离", {
                unit: " 格",
                description: "交棒后自己背离伙伴退开多远；接力式留下来照应、退得少，独走式退得远。速度越快退得越利落。"
            }),
        /** 接力光点数：18 + 物攻 ÷ 8 + 特攻 ÷ 8；夹 12..48。 */
        motes: formula(
            F.base(18).plus(F.stat("attack").div(8)).plus(F.stat("specialAttack").div(8)).clamp(12, 48).round(0),
            "接力光点", {
                unit: " 点",
                description: "接力棒飞行与交接时散出的光点数量，直接驱动表现密度；物攻与特攻越高越亮。"
            }),
        /** 接棒余韵：80 + 亲密度 ÷ 2.5；夹 60..180。 */
        markTicks: seconds(
            F.base(80).plus(F.individual("friendship").div(2.5)).clamp(60, 180).round(0),
            "接棒余韵", "伙伴身上留下「接棒」身份的时长；亲密度越高，这根棒的余温留得越久。"),
        /** 起手：8 −（速度 − 50）×0.03 [−1,2]；夹 5..11。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.03).clamp(-1, 2)).clamp(5, 11).round(0),
            "起手", "把身上的能力变化收拢成一根棒需要的时间；速度越快收得越短。"),
        /** 收招：8 −（速度 − 50）×0.02 [−1,1.5]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.5)).clamp(5, 12).round(0),
            "收招", "退步后的收势时间。"),
        /** 冷却：90 +（等级 − 30）×0.5 [−6,14]，接力式 +10／独走式 −6；夹 60..150。 */
        recharge: seconds(
            F.base(90).plus(F.level().minus(30).times(0.5).clamp(-6, 14))
                .plus(F.when(F.pref("relay", text("worldcombat.skill.batonpass.preference.relay")), F.const(10), F.const(-6)))
                .clamp(60, 150).round(0),
            "冷却", "再递一次棒前的等待；等级越高越熟练，独走式更省、接力式更费。")
    });

    stages(batonpassId, [
        { level: 34, values: { carry: 3, recharge: 80 } },
        { level: 52, values: { carry: 4, recharge: 70, handoffRange: 6 } }
    ]);

    describe(batonpassId, [
        { key: "description.0", values: ["carry", "markTicks"] },
        { key: "description.1", values: ["handoffRange", "withdraw"] },
        { key: "relay.on", values: [], when: function (context) { return read(context.detail.values, ["relay"]) === true; } },
        { key: "relay.off", values: [], when: function (context) { return read(context.detail.values, ["relay"]) !== true; } },
        { key: "world", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.carry"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.carry", "tier.1.handoffRange"] }
    ]);
}
