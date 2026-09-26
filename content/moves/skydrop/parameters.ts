/** Carry mass is kilograms; non-Pokemon eligibility estimates mass from the actual native collision volume. */
namespace PokemonSkills {
    /** 配置项的值：高抛（true）与低位速摔（false）。 */
    export function skydropHigh(config: any): boolean { return !!config && config.carryHigh === true; }

    actionParameters.define("skydrop", {
        /** 摔落威力：60 + 物攻偏移[−12,30] + 目标体重偏移[−8,44]；高抛 ×1.15 / 速摔 ×0.85；夹 40..170。 */
        slam: formula(
            F.base(60)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-12, 30))
                .plus(F.when(F.target("individual.weight"),F.target("individual.weight").div(10),F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(80)).minus(200).times(0.06).clamp(-8, 44))
                .times(F.when(F.pref("carryHigh"), F.const(1.15), F.const(0.85)))
                .clamp(40, 170).round(1),
            "摔落威力", { base: 60,
                unit: "威力",
                description: "把目标摔到地上那一下的威力；物攻越高、目标越沉摔得越重。落地时再乘实际提起的高度系数（天花板压顶提不高就更轻）；对手防御、相性与暴击在命中时另算。"
            }),
        /** 起吊上限：300kg + 物攻偏移[0,200] + 自身体重偏移[0,160]；夹 180..760 kg。 */
        liftCap: formula(
            F.base(300)
                .plus(F.stat("attack").minus(60).times(3).clamp(0, 200))
                .plus(F.body("weight").div(10).minus(300).times(0.4).clamp(0, 160))
                .clamp(180, 760).round(0),
            "起吊上限", {
                unit: "千克",
                description: "能拎起来的目标体重上限；物攻越高、自身体量越大拎得越沉。超过这个重量的目标抓不起来，本招在提交前被拒绝，不花 PP。"
            }),
        /** 提起高度：4 + 身高偏移[−0.4,1.4] + 高抛 1.8；夹 2.6..8 格。 */
        altitude: formula(
            F.base(4.0)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.4, 1.4))
                .plus(F.when(F.pref("carryHigh"), F.const(1.8), F.const(0)))
                .clamp(2.6, 8).round(2),
            "提起高度", { base: 4.0,
                unit: "格",
                description: "把目标提离地面多高；身量越高、高抛配置提得越高，落地的这一记也越重。"
            }),
        /** 滞空时长：22 − 速度偏移[−8,5] + 高抛 18；夹 12..56 刻。 */
        holdTicks: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.1).clamp(-5, 8))
                .plus(F.when(F.pref("carryHigh"), F.const(18), F.const(0)))
                .clamp(12, 56).round(0),
            "滞空时长", "把对手拎在空中停多久；速度快的个体滞留短，高抛配置滞留长。滞空期间对手无法行动。"),
        /** 上升速度：0.5 + 速度偏移[−0.1,0.35]；夹 0.3..1.0 格/刻。 */
        liftSpeed: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.3, 1.0).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "把目标往上提的快慢；速度快的个体更快到位、更少给对手的队友反应时间。"
            }),
        /** 摔落速度：1.0 + 速度偏移[−0.2,0.6]；夹 0.6..1.8 格/刻。 */
        dropSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.6)).clamp(0.6, 1.8).round(2),
            "摔落速度", {
                unit: "格/刻",
                description: "目标被摔下去的快慢；速度快的个体摔得更急。"
            }),
        /** 抓取距离：4 + 速度偏移[−0.5,1.0] + 等级偏移[0,1]；夹 3..6 格。 */
        reach: formula(
            F.base(.8).plus(F.body("width").times(.45))
                .plus(F.stat("speed").minus(60).times(.002).clamp(-.1,.2))
                .clamp(1,2.4).round(1),
            "抓取距离", {
                unit: "格",
                description: "要贴到多近才能抓住对手；速度与等级提高抓取距离。它也是本招的实际射程来源。"
            })
    });

    defineDamage("skydrop", "slam", {}, { contact: true });

    stages("skydrop", [
        { level: 30, values: { slam: 70 } },
        { level: 50, values: { slam: 82, altitude: 5 } }
    ]);

    describe("skydrop", [
        { key: "description.0", values: ["slam"] },
        { key: "description.1", values: ["liftCap"] },
        { key: "description.2", values: ["altitude","holdTicks"] },
        { key: "description.3", values: ["reach", "liftSpeed", "dropSpeed"] },
        { key: "high.on", values: [], when: function (context) { return skydropHigh(context.detail.values); } },
        { key: "high.off", values: [], when: function (context) { return !skydropHigh(context.detail.values); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slam"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.slam","tier.1.altitude"] }
    ]);
}
