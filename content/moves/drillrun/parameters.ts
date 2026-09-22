/**
 * 直冲钻 / drillrun 的参数与数值来源。
 *
 * 原生事实：Ground／物理／威力 80／命中 95／PP 10／接触／critRatio 2（暴击率高出一档；
 * Cobblemon 1.8，共 98 位直接学习者）。原生描述：「像钢钻一样，一边旋转身体一边撞击对手，容易击中要害」。
 *
 * 翻译：把「旋转身体像钢钻」落成一次**贴着地面的旋转钻穿**——身体拧成一支钻头直线钻过去，
 * 沿途每个挡路的对手被钻尖咬一下，最多贯穿 `through` 个；钻过后地表被犁开 `furrow` 格长的沟
 * （走 world.terrain 租约，replace 盖住自然地表、linger 让它活过招式，之后原方块自己回来）。
 * 「容易击中要害」沿用原生 critRatio 2 的共享结算，本单元只负责把这记要害画出来。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   bit      钻击威力：物攻定钻尖，速度定旋转咬合的频率。
 *   charge   冲刺长度：速度定一次钻出去多远，也是实际射程。
 *   thrust   冲刺速度：速度定每刻前进的距离。
 *   drill    钻头判定：碰撞箱宽度定钻身，身高定钻尖的竖直范围。
 *   through  贯穿目标数：等级 40 起才可能一次钻穿第二个。
 *   furrow   犁沟长度：体重定钻头压进地里多深、沟有多长。
 *   scarTicks 犁沟寿命：等级定那道沟留多久才恢复。
 *   sparks   碎屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏；重钻式以更慢的冲速与更长的冷却换更重的一钻、更长更久的沟。
 *
 * 配置 `carve` 双向取舍（默认关）：
 *   开（重钻式）：威力 ×1.10、犁沟 +1.2 格、沟寿命 +40 刻，代价是冲速 ×0.85、冲程 ×0.9、冷却 +8 刻。
 *   关（快钻式）：冲速 ×1.12、冲程 ×1.08、冷却 −6 刻，代价是威力 ×0.94、犁沟 −0.5 格。
 */
namespace PokemonSkills {
    export const drillrunId = "drillrun";
    export const drillrunScene = "world_combat:move_drillrun";
    export const drillrunVitalText = "world_combat.move.drillrun.text.vital";
    export const drillrunHitText = "world_combat.move.drillrun.text.hit";
    export const drillrunMissText = "world_combat.move.drillrun.text.miss";
    /** 表现里钻头的参考半径（格）；服务端传 scale = 实际判定半径 / 这个值。 */
    export const drillrunReference = 0.5;

    actionParameters.define(drillrunId, {
        /** 钻击威力：基础 80，物攻每比 55 多 1 加 0.22（夹 −12..30），速度每比 55 快 1 加 0.12（夹 −6..16）；
         *  重钻 ×1.10 / 快钻 ×0.94；夹在 48..140。 */
        bit: formula(
            F.base(80).plus(F.stat("attack").minus(55).times(0.22).clamp(-12, 30))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-6, 16))
                .times(F.when(F.pref("carve"), F.const(1.10), F.const(0.94))).clamp(48, 140).round(1),
            "钻击威力", {
                unit: "威力",
                description: "钻尖咬进对手那一下的接触威力；物攻给出钻尖的锋利，速度给出旋转咬合的频率。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 3.0 格，速度每比 55 快 1 加 0.012（夹 −0.5..1.2）；重钻 ×0.9 / 快钻 ×1.08；夹 2.4..5.2。 */
        charge: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.5, 1.2))
                .times(F.when(F.pref("carve"), F.const(0.9), F.const(1.08))).clamp(2.4, 5.2).round(2),
            "冲程", {
                unit: "格",
                description: "一次钻出去多远，也是本招的实际射程；腿快的个体钻得更远，快钻式拉得更长。"
            }),
        /** 冲速：基础 0.55 格/刻，速度每比 55 快 1 加 0.006（夹 −0.1..0.3）；重钻 ×0.85 / 快钻 ×1.12；夹 0.38..1.05。 */
        thrust: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.3))
                .times(F.when(F.pref("carve"), F.const(0.85), F.const(1.12))).clamp(0.38, 1.05).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲刺时每刻前进的距离；重钻式钻得更慢更稳，快钻式一冲到底。"
            }),
        /** 钻头判定：基础 0.5 格，碰撞箱每比 0.9 宽 1 加 0.35（夹 −0.08..0.35），身高每比 1.4 高 1 加 0.1（夹 −0.05..0.2）；
         *  夹 0.4..1.0。 */
        drill: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.35).clamp(-0.08, 0.35))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.2)).clamp(0.4, 1.0).round(2),
            "钻头判定", {
                unit: "格",
                description: "旋转的钻身扫过的横向判定半径；身板越大的个体钻头越粗。"
            }),
        /** 贯穿目标数：基础 1，等级 40 起每级 +0.03（夹 0..2）；夹 1..3。 */
        through: formula(
            F.base(1).plus(F.level().minus(40).times(0.03).clamp(0, 2)).floor().clamp(1, 3),
            "贯穿目标数", {
                unit: "个",
                description: "一次钻穿最多几个对手；等级高的个体钻得更透。"
            }),
        /** 犁沟长度：基础 2.5 格，体重每比 50 重 1 加 0.006（夹 −0.4..1.4）；重钻 +1.2 / 快钻 −0.5；夹 1.5..5.0。 */
        furrow: formula(
            F.base(2.5).plus(F.body("weight").minus(50).times(0.006).clamp(-0.4, 1.4))
                .plus(F.when(F.pref("carve"), F.const(1.2), F.const(-0.5))).clamp(1.5, 5.0).round(2),
            "犁沟长度", {
                unit: "格",
                description: "钻过之后在地表犁开多长一道沟；身重的个体压得更深、沟更长，重钻式再加一截。"
            }),
        /** 犁沟寿命：基础 120 刻，等级 30 起每级 +1.5（夹 −20..90）；重钻 +40；夹 80..260。 */
        scarTicks: seconds(
            F.base(120).plus(F.level().minus(30).times(1.5).clamp(-20, 90))
                .plus(F.when(F.pref("carve"), F.const(40), F.const(0))).clamp(80, 260).round(0),
            "犁沟寿命", "地上那道沟留多久才恢复原样；等级越高留得越久。"),
        /** 碎屑量：基础 16，物攻每比 55 多 1 加 0.3（夹 −4..28）；夹 12..44。 */
        sparks: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 28)).clamp(12, 44).round(0),
            "碎屑量", {
                unit: "个",
                description: "钻尖咬入时崩出的碎屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 顶开距离：基础 0.5 格，体重每比 50 重 1 加 0.004（夹 −0.1..0.5）；重钻 +0.2；夹 0.25..1.1。 */
        push: formula(
            F.base(0.5).plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.5))
                .plus(F.when(F.pref("carve"), F.const(0.2), F.const(0))).clamp(0.25, 1.1).round(2),
            "顶开距离", {
                unit: "格",
                description: "钻尖咬中时把对手沿冲刺方向顶开多远，好让自己钻穿过去；身重者顶得更开。"
            }),
        /** 起手：基础 6 刻，速度每比 55 快 1 减 0.025（夹 −2..2）；重钻 +2；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.025).clamp(-2, 2))
                .plus(F.when(F.pref("carve"), F.const(2), F.const(0))).clamp(3, 12).round(0),
            "起手", "蹲身起旋、把身体拧成钻头的时间；速度越快越短。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.02（夹 −2..2）；重钻 +2；夹 4..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("carve"), F.const(2), F.const(0))).clamp(4, 14).round(0),
            "收招", "钻到尽头停住、稳住身形的时间；重钻式收得更久。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 减 0.05（夹 −4..7）；重钻 +8 / 快钻 −6；夹 16..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("carve"), F.const(8), F.const(-6))).clamp(16, 46).round(0),
            "冷却", "再次起旋前等待多久；重钻式更长，快钻式更短。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.04)
    });

    defineDamage(drillrunId, "bit", {}, { contact: true });

    stages(drillrunId, [
        { level: 30, values: { bit: 88, furrow: 3.0 } },
        { level: 48, values: { bit: 96, through: 2, furrow: 3.6 } }
    ]);

    describe(drillrunId, [
        { key: "description.0", values: ["bit"] },
        { key: "description.1", values: ["charge", "thrust", "drill", "push"] },
        { key: "description.2", values: ["through", "furrow", "scarTicks"] },
        { key: "carve.on", values: [], when: function (context) { return read(context.detail.values, ["carve"]) === true; } },
        { key: "carve.off", values: [], when: function (context) { return read(context.detail.values, ["carve"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bit", "tier.0.furrow"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bit", "tier.1.through", "tier.1.furrow"] }
    ]);
}
