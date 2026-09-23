/**
 * 二连击 / doublehit —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Normal**／物理／威力 35／命中 90／PP 10／接触（`contact: 1`）／单体／连续 2 次（`multihit: 2`）。
 *
 * 翻译：把「使用尾巴等拍打对手进行攻击，连续 2 次给予伤害」落成一记**左右回扫**——尾巴先向一侧横扫，把身前的
 *   对手扫开、并把身位往那一侧带；再顺势反向回扫拍回。两扫方向相反，所以被扫到的人先被推到一边、又被推回，
 *   中间想站稳就得挪步。它照顾身前一整片（尾巴扫出的弧），而不是扎一个点。
 *   与同族分开：水流尾是一片向前压的弧形水墙、湿身、沿背离方向推走；铁尾锁定一点重砸；只有二连击是**原地
 *   左-右两扫**，把人沿弧线来回推，不带任何属性。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   swing      每扫威力：物攻（尾巴拍得有多重）；回扫式两扫更轻、直扫式更重。
 *   reach      尾长／射程：身高（尾巴越长扫得越远）＋等级。
 *   span       扫过张角：碰撞箱宽度（身体越宽尾巴抡得越开）。
 *   push       横向推开距离：体重（越重推得越狠）＋物攻；回扫式更大。
 *   maxTargets 最多扫到几个：碰撞箱宽度。
 *   gap        两扫间隔：速度（收尾再扫的快慢）。
 *   dust       扬尘数量：物攻，直接驱动发射量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `arc`（回扫，默认开）双向取舍：开启＝尾巴向一侧扫再反向回扫，张角 ×1.1、能同时扫到更多、横向推力 ×1.2，
 *   把人推来推去；代价是每扫威力 ×0.9、间隔略长。关闭（直扫式）＝两扫同向，张角 ×0.62（更窄更集中）、每扫 ×1.15，
 *   沿同一个方向一路把人推出去。两向各有适用局面：控制多人用回扫，单点推离用直扫。
 *
 * 伤害段 swing：每一扫各自结算一次接触伤害，规格空（共享结算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const doublehitId = "doublehit";
    export const doublehitScene = "world_combat:move_doublehit";
    export const doublehitTurnText = "world_combat.move.doublehit.text.turn";

    actionParameters.define(doublehitId, {
        /** 每扫威力：基础 35，物攻每比 55 多 1 加 0.15（夹 -5..16）；回扫 ×0.9 / 直扫 ×1.15；夹在 18..60。 */
        swing: formula(
            F.base(35).plus(F.stat("attack").minus(55).times(0.15).clamp(-5, 16))
                .times(F.when(F.pref("arc"), F.const(0.9), F.const(1.15))).clamp(18, 60).round(1),
            "每扫威力", {
                unit: "威力",
                description: "尾巴每一扫各自结算的威力；物攻越高拍得越重。回扫式两扫更轻以便来回拉扯，直扫式更重。对手物防、相性与暴击在每扫命中时另算。"
            }),
        /** 尾长：基础 3.4 格，身高每比 1.4 高 1 格加 0.8（夹 -0.3..1.2），等级每比 20 高 1 加 0.02（夹 0..0.4）；夹在 2.6..4.8。 */
        reach: formula(
            F.base(3.4).plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 1.2))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.4)).clamp(2.6, 4.8).round(2),
            "尾长", {
                unit: "格",
                description: "尾巴能够到多远；身高与等级越高扫得越远。它也是本招的实际射程来源。"
            }),
        /** 扫过张角：基础 150 度，身宽每比 0.9 宽 1 格加 45 度（夹 -15..70）；回扫 ×1.1 / 直扫 ×0.62；夹在 70..220。 */
        span: formula(
            F.base(150).plus(F.body("width").minus(0.9).times(45).clamp(-15, 70))
                .times(F.when(F.pref("arc"), F.const(1.1), F.const(0.62))).clamp(70, 220).round(0),
            "扫过张角", {
                unit: "度",
                description: "尾巴一扫扫过的总角度；身宽的个体抡得更开。回扫式罩得更宽，直扫式收窄成一条集中带。画面里的扇形就是判定范围。"
            }),
        /** 横向推开：基础 0.7 格，体重每比 60 重 1 加 0.004（夹 -0.2..0.5），物攻每比 55 多 1 加 0.002（夹 -0.1..0.3）；回扫 ×1.2；夹在 0.3..1.6。 */
        push: formula(
            F.base(0.7).plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.5))
                .plus(F.stat("attack").minus(55).times(0.002).clamp(-0.1, 0.3))
                .times(F.when(F.pref("arc"), F.const(1.2), F.const(1))).clamp(0.3, 1.6).round(2),
            "横向推开", {
                unit: "格",
                description: "每一扫把目标沿扫动方向推开多远；体重与物攻越大推得越狠。回扫式第一扫往一侧、第二扫往另一侧，直扫式两扫同向一路推出去。"
            }),
        /** 最多扫到几个：基础 2，身宽每比 1.0 宽 1 格加 1.2（夹 -0.5..1.6）；夹在 1..4 并向下取整。 */
        maxTargets: formula(
            F.base(2).plus(F.body("width").minus(1.0).times(1.2).clamp(-0.5, 1.6)).clamp(1, 4).floor(),
            "最多扫到", {
                unit: "个",
                description: "一记最多同时扫到几个非友方目标；尾巴越长的个体罩得越广。"
            }),
        /** 两扫间隔：基础 4 刻，速度每比 55 快 1 减 0.02（夹 -1..1.2）；夹在 2..7。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.2)).clamp(2, 7).round(0),
            "两扫间隔", "第一扫与第二扫之间隔多久；速度越快收尾再扫越快。"),
        /** 扬尘数量：基础 14，物攻每比 55 多 1 加 0.12（夹 -4..14）；夹在 10..36。 */
        dust: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 14)).clamp(10, 36).round(0),
            "扬尘数量", {
                unit: "点",
                description: "每一扫带起的尘土数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 55 快 1 减 0.025（夹 -1.2..2）；夹在 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.2, 2)).clamp(4, 11).round(0),
            "起手", "转身把尾巴甩起来的时间；速度越快越短。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 11).round(0),
            "收招", "两扫收势的时间；速度越快收得越快。"),
        /** 冷却：基础 24 刻，等级每比 20 高 1 减 0.12（夹 0..3.5）；夹在 15..32。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(20).times(0.12).clamp(0, 3.5)).clamp(15, 32).round(0),
            "冷却", "再一次两扫之间的等待；等级越高回得越快。")
    });

    defineDamage(doublehitId, "swing", {}, { contact: true });

    stages(doublehitId, [
        { level: 28, values: { swing: 40 } },
        { level: 44, values: { swing: 47, push: 0.9 } },
        { level: 60, values: { swing: 53 } }
    ]);

    describe(doublehitId, [
        { key: "description.0", values: ["swing","reach","span","maxTargets"] },
        { key: "description.1", values: ["gap", "push"] },
        { key: "arc.on", values: [], when: function (context) { return read(context.detail.values, ["arc"]) === true; } },
        { key: "arc.off", values: [], when: function (context) { return read(context.detail.values, ["arc"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swing"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swing", "tier.1.push"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.swing"] }
    ]);
}
