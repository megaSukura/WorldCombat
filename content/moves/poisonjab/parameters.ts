/**
 * 毒击 / poisonjab —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／物理／威力 80／命中 100／PP 20／单体／接触 flag／30% 令目标中毒。
 *
 * 翻译：把「用带毒的触手或手臂刺入对手」落成一记**不移动身体、只把肢体送出去**的深刺——施法者站定，
 *   把带毒的手臂或触手沿直线递到 `reach` 那么远；够长的肢体是它相对同族的位置（比毒针近、比蹭蹭脸颊远）。
 *   刺中后按 `poisonChance` 在伤口里留下毒（原生 30% 起，物攻越高越容易扎进毒腺），并把对手顶开一点。
 *   刺空就是彻底的空（不造成任何事，只走冷却）。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   jab          深刺威力：**物攻**（这是本族走物攻的重击）决定劲道。
 *   reach        出臂距离：**碰撞箱高度**（肢体长度）＋等级（熟练度）；深刺式收短一点。
 *   touchReach   刺击判定：碰撞箱高度；大个子的肢体更粗。
 *   poisonChance 中毒概率：物攻（越重越容易扎进毒腺）；深刺式再抬一档。
 *   venomTicks   中毒时长：等级＋**特攻**（毒液分泌量）；与伤害分开来源。
 *   push         顶开距离：**体重**（壮个体顶得更远）。
 *   drops        毒滴数：物攻；同时是画面里伤口溅出的毒滴数量。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 *
 * 配置 `deep`（深刺式，默认关）双向取舍：开启＝jab ×1.12、中毒概率 ×1.12、顶开 ×1.15，代价是出臂 ×0.92、
 *   起手 +2 刻、收招 ×1.2——更要贴脸、更容易被打断；关闭＝快刺，出手快、够得远，但每一记更轻。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    actionParameters.define("poisonjab", {
        /** 深刺威力：80 + 物攻偏移[−14,26]；深刺 ×1.12；夹 58..120。 */
        jab: formula(
            F.base(80).plus(F.stat("attack").minus(70).times(0.35).clamp(-14, 26))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(1)))
                .clamp(58, 120).round(1),
            "深刺威力", {
                unit: "威力",
                description: "带毒肢体刺进去那一记的基础威力；物攻越高越重，本族唯一走物攻的重击。深刺式更狠。对手物防、相性与暴击在命中时另算。"
            }),
        /** 出臂距离：2.6 + 高度偏移[−0.3,1.2] + 等级(≥25)偏移[0,0.5]；深刺 ×0.92；夹 2.1..4.2。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.9).clamp(-0.3, 1.2))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.5))
                .times(F.when(F.pref("deep"), F.const(0.92), F.const(1)))
                .clamp(2.1, 4.2).round(2),
            "出臂距离", {
                unit: "格",
                description: "肢体能够到多远；个子高、越来越熟练的个体伸得更远。深刺式收短一点，更要贴脸。它也是本招的实际射程。"
            }),
        /** 刺击判定：0.95 + 高度偏移[−0.1,0.5]；夹 0.7..1.7。 */
        touchReach: formula(
            F.base(0.95).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.5)).clamp(0.7, 1.7).round(2),
            "刺击判定", {
                unit: "格",
                description: "这条肢体扫过的横向判定半径；大个子的肢体更粗，对照线上的目标更容易扎中。"
            }),
        /** 中毒概率：0.30 + 物攻偏移[−0.08,0.22]；深刺 ×1.12；夹 0.18..0.58。 */
        poisonChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(70).times(0.0018).clamp(-0.08, 0.22))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(1)))
                .clamp(0.18, 0.58),
            "中毒概率", "刺中后按这个概率在伤口里留下毒；原生 30% 起，物攻越高越容易扎进毒腺、越难被对方清掉这次机会。"),
        /** 中毒时长：300 + 等级(≥25)偏移[0,120] + 特攻偏移[−20,70]；夹 220..520。 */
        venomTicks: seconds(
            F.base(300).plus(F.level().minus(25).times(4).clamp(0, 120))
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 70))
                .clamp(220, 520).round(0),
            "中毒时长", "如果没有被立即解掉，这份毒持续多久；等级与特攻（毒液分泌量）越高挂得越久。"),
        /** 顶开距离：0.30 + 体重每 10 加 0.03（上限 0.5）；深刺 ×1.15；夹 0.15..0.9。 */
        push: formula(
            F.base(0.30).plus(F.body("weight").div(10).times(0.03).clamp(0, 0.5))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(1)))
                .clamp(0.15, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "刺中后沿刺入方向把对手顶开多远；体重越大顶得越远，深刺式更明显。"
            }),
        /** 毒滴数：14 + 物攻偏移[−4,16]；夹 10..34。 */
        drops: formula(
            F.base(14).plus(F.stat("attack").minus(70).times(0.12).clamp(-4, 16)).clamp(10, 34).round(0),
            "毒滴数", {
                unit: "滴",
                description: "伤口溅出的毒滴数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−1,3] + 深刺 2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0))).clamp(4, 13).round(0),
            "起手", "把肢体盘起来再刺出去的时间；速度越快越短，深刺式要多蓄一拍。"),
        /** 收招：8；深刺 ×1.2 / 快刺 ×0.9；夹 5..13。 */
        settle: seconds(
            F.base(8).times(F.when(F.pref("deep"), F.const(1.2), F.const(0.9))).clamp(5, 13).round(0),
            "收招", "把肢体收回架势的时间；深刺式收得更慢，快刺更快。"),
        /** 冷却：18 − 等级(≥25)偏移[0,4]；夹 10..26。 */
        recharge: seconds(
            F.base(18).minus(F.level().minus(25).times(0.08).clamp(0, 4)).clamp(10, 26).round(0),
            "冷却", "两记深刺之间的等待；等级越高回得越快。")
    });

    defineDamage("poisonjab", "jab", {});

    stages("poisonjab", [
        { level: 30, values: { jab: 88 } },
        { level: 45, values: { jab: 96, venomTicks: 420 } }
    ]);

    describe("poisonjab", [
        { key: "description.0", values: ["jab","reach"] },
        { key: "description.1", values: ["poisonChance","venomTicks","push"] },
        { key: "description.2", values: ["tempo","settle","recharge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.venomTicks"] }
    ]);
}
