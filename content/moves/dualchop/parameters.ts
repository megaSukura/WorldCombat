/**
 * 二连劈 / dualchop —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Dragon**／物理／威力 40／命中 90／PP 15／接触（`contact: 1`）／单体／连续 2 次（`multihit: 2`）。
 *
 * 翻译：把「用身体坚硬的部分拍打对手，连续２次给予伤害」落成一记**同点两劈**——抡起坚硬的前肢/角，第一劈砸开
 *   对方的架势，并在落点地面留下一道裂痕；第二劈顺着这道裂痕劈进同一处，若第一劈已命中则撕得更深。两下都是
 *   站定、垂直的向前的重击，龙属性能量沿裂痕扩散。
 *   与同族分开：二连击是水平回扫、把人来回推；双翼是掠飞、有升力；只有二连劈是**站定、垂直下砸、地面开裂**，
 *   第一劈的裂痕就是第二劈的落点标记，反制方式是趁两劈之间离开裂痕。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   chop       每劈威力：物攻（劈得有多狠）＋体重（砸下的分量）。
 *   reach      出手距离：身高（前肢/角够多远）＋等级。
 *   span       劈面张角：碰撞箱宽度。
 *   breach     第二劈加成：等级（越会抓裂痕）；配置关闭时为 0。
 *   gap        两劈间隔：速度；裂痕追击式更慢一点。
 *   maxTargets 最多劈到几个：裂痕追击式固定 1，分劈式随身宽增加。
 *   quake      地面裂痕长度：体重与身高（砸得越重、个子越高，裂得越长）。
 *   crackTicks 裂痕留存：等级。
 *   push       第一劈的推力：体重。
 *   shards     碎石数量：物攻，直接驱动发射量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `breach`（裂痕追击，默认开）双向取舍：开启＝两劈打在同一块窄面，第二劈在第一劈命中后按 `breach` 加成撕深，
 *   但裂面窄（张角 ×0.85、只能打 1 个）、间隔多 1 刻；关闭（分劈式）＝两劈沿身前一小片摊开，张角 ×1.3、能同时
 *   劈到多个、每劈 ×1.05，但没有裂痕加成。两向各有适用局面：单体爆发用裂痕，多人分摊用分劈。
 */
namespace PokemonSkills {
    export const dualchopId = "dualchop";
    export const dualchopScene = "world_combat:move_dualchop";
    export const dualchopBreachText = "world_combat.move.dualchop.text.breach";

    actionParameters.define(dualchopId, {
        /** 每劈威力：基础 40，物攻每比 55 多 1 加 0.18（夹 -6..20），体重每比 60 重 1 加 0.006（夹 -3..12）；分劈式 ×1.05；夹在 20..72。 */
        chop: formula(
            F.base(40).plus(F.stat("attack").minus(55).times(0.18).clamp(-6, 20))
                .plus(F.body("weight").minus(60).times(0.006).clamp(-3, 12))
                .times(F.when(F.pref("breach"), F.const(1), F.const(1.05))).clamp(20, 72).round(1),
            "每劈威力", {
                unit: "威力",
                description: "每一劈各自结算的威力；物攻越高劈得越狠，身体越沉砸下的分量越足。对手物防、相性与暴击在每劈命中时另算。"
            }),
        /** 出手距离：基础 2.9 格，身高每比 1.4 高 1 格加 0.7（夹 -0.2..1.0），等级每比 20 高 1 加 0.02（夹 0..0.5）；夹在 2.2..4.2。 */
        reach: formula(
            F.base(2.9).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.2, 1.0))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.5)).clamp(2.2, 4.2).round(2),
            "出手距离", {
                unit: "格",
                description: "坚硬前肢能够到多远；身高与等级越高够得越远。它也是本招的实际射程来源。"
            }),
        /** 劈面张角：基础 62 度，身宽每比 0.9 宽 1 格加 30 度（夹 -8..50）；裂痕追击 ×0.85 / 分劈 ×1.3；夹在 40..150。 */
        span: formula(
            F.base(62).plus(F.body("width").minus(0.9).times(30).clamp(-8, 50))
                .times(F.when(F.pref("breach"), F.const(0.85), F.const(1.3))).clamp(40, 150).round(0),
            "劈面张角", {
                unit: "度",
                description: "每一劈罩住的总角度；身宽的个体劈面更宽。裂痕追击式收窄成一块窄面，分劈式摊得更开。画面里的扇形就是判定范围。"
            }),
        /** 第二劈加成：基础 0.18，等级每比 20 高 1 加 0.005（夹 0..0.16）；裂痕追击 ×1 / 分劈 ×0；夹在 0..0.4。 */
        breach: percent(
            F.base(0.18).plus(F.level().minus(20).times(0.005).clamp(0, 0.16))
                .times(F.when(F.pref("breach"), F.const(1), F.const(0))).clamp(0, 0.4),
            "第二劈加成", "第一劈命中后，第二劈顺着同一道裂痕劈进去，威力最多再抬这么多；等级越高越会抓裂痕。分劈式没有这道加成。第一劈没中就加不上。"),
        /** 两劈间隔：基础 6 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5），裂痕追击 +1；夹在 3..9。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("breach"), F.const(1), F.const(0))).clamp(3, 9).round(0),
            "两劈间隔", "第一劈与第二劈之间隔多久；速度越快抡得越快，追同一道裂痕要多花一点。"),
        /** 最多劈到几个：裂痕追击式固定 1；分劈式基础 1 + 身宽(每比 1.0 宽 1 格加 1.2，夹 0..1.8)；夹在 1..3。 */
        maxTargets: formula(
            F.base(1).plus(F.when(F.pref("breach"), F.const(0),
                F.body("width").minus(1.0).times(1.2).clamp(0, 1.8))).clamp(1, 3).floor(),
            "最多劈到", {
                unit: "个",
                description: "一记最多同时劈到几个非友方目标；裂痕追击式只劈同一个目标，分劈式能沿身前摊开。"
            }),
        /** 裂痕长度：基础 3 格，体重每比 60 重 1 加 0.03（夹 -1..4），身高每比 1.4 高 1 加 1.2（夹 -0.6..2.5）；夹在 2..9。 */
        quake: formula(
            F.base(3).plus(F.body("weight").minus(60).times(0.03).clamp(-1, 4))
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-0.6, 2.5)).clamp(2, 9).round(0),
            "裂痕长度", {
                unit: "格",
                description: "第一劈在身前地面砸出的裂痕有多长；体重与身高越大裂得越远。画面里沿地面铺开的线就是它。"
            }),
        /** 裂痕留存：基础 60 刻，等级每比 20 高 1 加 1.5（夹 0..60）；夹在 40..140。 */
        crackTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.5).clamp(0, 60)).clamp(40, 140).round(0),
            "裂痕留存", "地面裂痕留多久后原方块回来；等级越高裂痕收得越慢。"),
        /** 第一劈推力：基础 0.35 格，体重每比 60 重 1 加 0.003（夹 -0.1..0.4）；夹在 0.15..0.9。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.003).clamp(-0.1, 0.4)).clamp(0.15, 0.9).round(2),
            "第一劈推力", {
                unit: "格",
                description: "第一劈把目标顶开多远；身体越沉顶得越开。"
            }),
        /** 碎石数量：基础 14，物攻每比 55 多 1 加 0.12（夹 -4..14）；夹在 10..36。 */
        shards: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 14)).clamp(10, 36).round(0),
            "碎石数量", {
                unit: "块",
                description: "每一劈砸起的碎石数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.03（夹 -1.5..2.5），裂痕追击 +1；夹在 5..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("breach"), F.const(1), F.const(0))).clamp(5, 13).round(0),
            "起手", "抡起坚硬前肢、对准落点的时间；速度越快越短，追裂痕要多瞄一点。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 12).round(0),
            "收招", "两劈收势的时间；速度越快收得越快。"),
        /** 冷却：基础 28 刻，等级每比 20 高 1 减 0.15（夹 0..4）；夹在 18..38。 */
        recharge: seconds(
            F.base(28).minus(F.level().minus(20).times(0.15).clamp(0, 4)).clamp(18, 38).round(0),
            "冷却", "再一次二连劈之间的等待；等级越高回得越快。")
    });

    defineDamage(dualchopId, "chop", {}, { contact: true });

    stages(dualchopId, [
        { level: 30, values: { chop: 46 } },
        { level: 48, values: { chop: 54, breach: 0.24 } },
        { level: 64, values: { chop: 60 } }
    ]);

    describe(dualchopId, [
        { key: "description.0", values: ["chop", "reach", "span", "maxTargets"] },
        { key: "description.1", values: ["gap", "breach", "push"] },
        { key: "description.2", values: ["quake", "crackTicks", "shards"] },
        { key: "breach.on", values: [], when: function (context) { return read(context.detail.values, ["breach"]) === true; } },
        { key: "breach.off", values: [], when: function (context) { return read(context.detail.values, ["breach"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop", "tier.1.breach"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.chop"] }
    ]);
}
