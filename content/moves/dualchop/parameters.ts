/**
 * 二连劈 / dualchop —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Dragon**／物理／威力 40／命中 90／PP 15／接触（`contact: 1`）／单体／连续 2 次（`multihit: 2`）。
 *
 * 翻译：把「用身体坚硬的部分拍打对手，连续２次给予伤害」落成一记**两道刀路**——第一刀沿准线窄而重地竖劈下去，
 *   第二刀在原落点两侧横向展开一记又宽又短的横斩。两刀形状不同，所以两击各有存在理由；两刀的威力在提交时
 *   沿原总额分配，第一刀更重、第二刀更广，不再依赖"第一刀命中才加第二刀"的加成。地面裂痕只是第一刀实际触地的
 *   视觉线，不替换任何方块；反制方式是趁两刀之间的空当走出横斩范围。
 *   与同族分开：二连击是原地左右回扫、把人来回推；双翼是掠飞、前后反向两拍；双光束是两道远程眼束。只有二连劈是
 *   **站定、一竖一横两道刀路**，第二刀的横斩围绕第一刀的落点展开。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   chop       第一刀威力：物攻（劈得有多狠）＋体重（砸下的分量）。
 *   slash      第二刀威力：物攻＋身宽（横斩摊多开）＋等级（收势）。
 *   reach      第一刀长度：身高（前肢/角够多远）＋等级。
 *   edge       第一刀宽度：身高（刀锋越细或越沉）。
 *   breadth    第二刀横斩半径：身高＋等级。
 *   span       第二刀横斩张角：碰撞箱宽度。
 *   gap        两刀间隔：速度。
 *   maxTargets 第二刀最多劈到几个：碰撞箱宽度。
 *   quake      地面裂痕长度：体重与身高（砸得越重、个子越高，裂得越长）。
 *   crackTicks 裂痕留存：等级，只影响视觉线的停留时长。
 *   push       第一刀的推力：体重。
 *   shards     碎石数量：物攻，直接驱动发射量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 伤害段 chop／slash：第一刀与第二刀各自结算一次接触伤害，规格空（共享结算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const dualchopId = "dualchop";
    export const dualchopScene = "world_combat:move_dualchop";

    actionParameters.define(dualchopId, {
        /** 第一刀威力：基础 50，物攻每比 55 多 1 加 0.20（夹 -6..22），体重每比 60 重 1 加 0.006（夹 -3..12）；夹在 26..94。 */
        chop: formula(
            F.base(50).plus(F.stat("attack").minus(55).times(0.20).clamp(-6, 22))
                .plus(F.body("weight").minus(60).times(0.006).clamp(-3, 12)).clamp(26, 94).round(1),
            "第一刀威力", {
                unit: "威力",
                description: "第一刀窄而重的竖劈各自结算的威力；物攻越高劈得越狠，身体越沉砸下的分量越足。对手物防、相性与暴击在命中时另算。"
            }),
        /** 第二刀威力：基础 30，物攻每比 55 多 1 加 0.10（夹 -4..12），身宽每比 0.9 宽 1 格加 8（夹 -3..12），等级每比 20 高 1 加 0.06（夹 0..3）；夹在 16..62。 */
        slash: formula(
            F.base(30).plus(F.stat("attack").minus(55).times(0.10).clamp(-4, 12))
                .plus(F.body("width").minus(0.9).times(8).clamp(-3, 12))
                .plus(F.level().minus(20).times(0.06).clamp(0, 3)).clamp(16, 62).round(1),
            "第二刀威力", {
                unit: "威力",
                description: "第二刀横向展开的宽短横斩各自结算的威力；物攻越高越沉，身宽的个体摊得更开，等级越高收势越足。对手物防、相性与暴击在命中时另算。"
            }),
        /** 第一刀长度：基础 2.9 格，身高每比 1.4 高 1 格加 0.7（夹 -0.2..1.0），等级每比 20 高 1 加 0.02（夹 0..0.5）；夹在 2.2..4.2。 */
        reach: formula(
            F.base(2.9).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.2, 1.0))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.5)).clamp(2.2, 4.2).round(2),
            "出手距离", {
                unit: "格",
                description: "第一刀沿准线能够到多远；身高与等级越高够得越远。它也是本招的实际射程来源。"
            }),
        /** 第一刀宽度：基础 0.32 格，身高每比 1.4 高 1 格加 0.12（夹 -0.1..0.3）；夹在 0.2..0.7。 */
        edge: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.3)).clamp(0.2, 0.7).round(2),
            "第一刀宽度", {
                unit: "格",
                description: "第一刀竖劈刀路的半宽；个子越高的个体刀锋越长。刀路只取这条线碰到的第一个目标，实墙会截停。"
            }),
        /** 第二刀横斩半径：基础 1.8 格，身高每比 1.4 高 1 格加 0.35（夹 -0.3..0.9），等级每比 20 高 1 加 0.02（夹 0..0.4）；夹在 1.2..3.0。 */
        breadth: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.3, 0.9))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.4)).clamp(1.2, 3.0).round(2),
            "横斩半径", {
                unit: "格",
                description: "第二刀以第一刀落点为圆心、横向展开的半径；个子越高、等级越高展得越开。"
            }),
        /** 第二刀张角：基础 100 度，身宽每比 0.9 宽 1 格加 30 度（夹 -10..60）；夹在 60..180。 */
        span: formula(
            F.base(100).plus(F.body("width").minus(0.9).times(30).clamp(-10, 60)).clamp(60, 180).round(0),
            "横斩张角", {
                unit: "度",
                description: "第二刀横斩扫过的总角度；身宽的个体劈面更宽。画面里的扇形就是判定范围。"
            }),
        /** 两刀间隔：基础 6 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..9。 */
        gap: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 9).round(0),
            "两刀间隔", "第一刀与第二刀之间隔多久；速度越快抡得越快。"),
        /** 最多劈到几个：基础 1，身宽每比 1.0 宽 1 格加 1.2（夹 0..1.8）；夹在 1..3 并向下取整。 */
        maxTargets: formula(
            F.base(1).plus(F.body("width").minus(1.0).times(1.2).clamp(0, 1.8)).clamp(1, 3).floor(),
            "最多劈到", {
                unit: "个",
                description: "第二刀横斩最多同时劈到几个非友方目标；身宽的个体罩得更广。第一刀只劈刀路上的第一个目标。"
            }),
        /** 裂痕长度：基础 3 格，体重每比 60 重 1 加 0.03（夹 -1..4），身高每比 1.4 高 1 加 1.2（夹 -0.6..2.5）；夹在 2..9。 */
        quake: formula(
            F.base(3).plus(F.body("weight").minus(60).times(0.03).clamp(-1, 4))
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-0.6, 2.5)).clamp(2, 9).round(0),
            "裂痕长度", {
                unit: "格",
                description: "第一刀沿地面犁出的视觉裂痕有多长；体重与身高越大裂得越远。它只画线，不改动方块。"
            }),
        /** 裂痕留存：基础 60 刻，等级每比 20 高 1 加 1.5（夹 0..60）；夹在 40..140。 */
        crackTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.5).clamp(0, 60)).clamp(40, 140).round(0),
            "裂痕留存", "地面裂痕这条视觉线留多久；等级越高留得越久。"),
        /** 第一刀推力：基础 0.35 格，体重每比 60 重 1 加 0.003（夹 -0.1..0.4）；夹在 0.15..0.9。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.003).clamp(-0.1, 0.4)).clamp(0.15, 0.9).round(2),
            "第一刀推力", {
                unit: "格",
                description: "第一刀把刀路上的目标顶开多远；身体越沉顶得越开。"
            }),
        /** 碎石数量：基础 14，物攻每比 55 多 1 加 0.12（夹 -4..14）；夹在 10..36。 */
        shards: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 14)).clamp(10, 36).round(0),
            "碎石数量", {
                unit: "块",
                description: "两刀砸起的碎石数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.03（夹 -1.5..2.5）；夹在 5..13。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5)).clamp(5, 13).round(0),
            "起手", "抡起坚硬前肢、对准准线的时间；速度越快越短。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 12).round(0),
            "收招", "两刀收势的时间；速度越快收得越快。"),
        /** 冷却：基础 28 刻，等级每比 20 高 1 减 0.15（夹 0..4）；夹在 18..38。 */
        recharge: seconds(
            F.base(28).minus(F.level().minus(20).times(0.15).clamp(0, 4)).clamp(18, 38).round(0),
            "冷却", "再一次二连劈之间的等待；等级越高回得越快。")
    });

    defineDamage(dualchopId, "chop", {}, { contact: true });
    defineDamage(dualchopId, "slash", {}, { contact: true });

    stages(dualchopId, [
        { level: 30, values: { chop: 46, slash: 26 } },
        { level: 48, values: { chop: 54, slash: 34 } },
        { level: 64, values: { chop: 60, slash: 40 } }
    ]);

    describe(dualchopId, [
        { key: "description.0", values: ["chop", "reach", "edge"] },
        { key: "description.1", values: ["slash", "breadth", "span", "maxTargets"] },
        { key: "description.2", values: ["gap", "push"] },
        { key: "description.3", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop", "tier.1.slash"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.chop"] }
    ]);
}
