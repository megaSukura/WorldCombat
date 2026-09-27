/**
 * 摇尾巴 / Tail Whip 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 30／目标 allAdjacentFoes（相邻全体）／boosts={def:-1}（降低防御）／
 *       flags 含 protect、reflectable、mirror（需要有形、会被看见）。
 * 世界化：不是隔空扣等级，而是**转过身把尾巴从一侧扫到另一侧再扫回来**——看得见这条尾巴的对手跟着晃神，
 *   架势散掉、防御下降。它铺在身后的 120 度扇带里，所以正面冲上来的敌人不会被甩到；这与「瞪眼」身前的一张
 *   扇面正好互补。尾巴要有形、要被看见：扇带里的人必须和施法者通视，掩体挡下就甩不到。命中后挂共享身份
 *   world_combat:status/guardbroken 的真实 MobEffect，再用 NativeEffects.boostWindow 把防御下降绑在这份载体上：
 *   载体在，降防就在；晃神到期或被清，防御一同收回。宝可梦损失原生防御等级，其他生物落到护甲属性。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop        基础 1 级，等级 ≥ 45 升到 2 级；夹 1..2。经验越足，尾巴越能晃散人的架势。
 *   sweepRadius 2.2 + 宽度 × 1.4，夹 1.8..4.2；体型越宽，尾巴扫出的扇带越大。
 *   dazeTicks   90 + 亲密度 × 0.6，夹 60..220；越亲近的施法者，那份晃神留得越久，防御也压得越久。
 *   arcs        18 + (速度 − 50) × 0.5，夹 14..46；速度越快，一次甩出的尾迹越多（也是画面里的数量）。
 *   tempo       7 − (速度 − 60) × 0.04，夹 4..12；速度越快越早转身。
 *   recharge    100 + (等级 − 30) × 0.6，夹 80..180；等级高时一晃就是 2 级、晃得更久，收势与冷却也更大。PP 30。
 */
namespace PokemonSkills {
    export const tailwhipId = "tailwhip";
    export const tailwhipEffect = "world_combat:tailwhip_wobble";
    export const tailwhipScene = "world_combat:move_tailwhip";
    export const tailwhipSpot = "world_combat:status/guardbroken";

    actionParameters.define(tailwhipId, {
        drop: formula(
            F.base(1).plus(F.when(F.level().gte(45), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "防御下降", {
                unit: " 级",
                description: "被尾巴晃到者暂时损失的防御等级，绑在晃神载体上，晃神结束或载体被清就收回；等级达到 45 时从 1 级升到 2 级。"
            }),
        sweepRadius: formula(
            F.base(2.2).plus(F.body("width").times(1.4)).clamp(1.8, 4.2).round(2),
            "尾巴半径", {
                unit: " 格",
                description: "尾巴扫出的扇带半径；体型越宽扇带越大。画面前铺到哪，就是会被晃到哪。"
            }),
        dazeTicks: seconds(
            F.base(90).plus(F.individual("friendship").times(0.6)).clamp(60, 220).round(0),
            "晃神时长", "被晃到的人架势散多久；施法者越亲近留得越久。"),
        arcs: formula(
            F.base(18).plus(F.stat("speed").minus(50).max(0).times(0.5)).clamp(14, 46).round(0),
            "尾迹量", {
                unit: " 道",
                description: "一次摇尾巴甩出的尾迹数量；施法者速度越快甩得越多，画面里的弧光也按它画出。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(4, 12).round(0),
            "起手", "转过身、把尾巴摆开需要多久；速度越快越早转身。"),
        recharge: seconds(
            F.base(100).plus(F.level().minus(30).max(0).times(0.6)).clamp(80, 180).round(0),
            "冷却", "两次摇尾巴之间的等待；等级高时一晃就是 2 级、晃神更久，收势更大，冷却也随之上调。PP 30。")
    });

    describe(tailwhipId, [
        { key: "description.0", values: ["drop","dazeTicks"] },
        { key: "description.1", values: ["sweepRadius"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
