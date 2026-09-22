/**
 * 暗影爪 / shadowclaw 的参数与数值来源。
 *
 * 原生事实：Ghost／物理／威力 70／命中 100／PP 15／接触／critRatio 2（暴击率高出一档；
 * Cobblemon 1.8，397 位学习者）。原生描述：「以影子做成的锐爪劈开对手，容易击中要害」。
 *
 * 翻译：把「影子做成的锐爪」落成一条从施法者脚下铺到对手**身后**的暗带，由那一端反向伸出一只影爪，
 * 从对手照不到的一面抓进要害。它的形状是「影先到、爪后到」：对手在看正面，影子已经绕到它背后。
 * 对手正把注意力放在别人身上时（当前攻击目标不是施法者），这一爪吃满 `ambush` 加成。
 * 「容易击中要害」沿用原生 critRatio 2 的共享结算，本单元只负责把这记要害画出来。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   rend    抓击威力：物攻定爪口，体重定爪沉。
 *   reach   抓距：速度定影子够到的正面距离，也是实际射程。
 *   shade   影铺距离：体重与等级定影子绕到目标身后多远；深影式再往前铺。
 *   claw    爪面半宽：碰撞箱宽度定判定带有多宽；贴影式更宽。
 *   depth   爪的竖直覆盖：身高定这一爪从脚上抓多高。
 *   gouge   影痕时长：等级定命中处那道影痕留多久。
 *   shred   崩屑量：物攻换算，驱动表现。
 *   ambush  暗算加成：对手没在看自己时额外增加的伤害比例；等级越高越狠，深影式再高一档。
 *   tempo／aftercast／recharge：速度定节奏；深影式以更长的起手与冷却换更重更远的影。
 *
 * 配置 `deep` 双向取舍（默认关）：
 *   开（深影式）：威力 ×1.12、影铺 +0.6 格、影痕 +30 刻、暗算 +0.1，代价是起手 +3 刻、冷却 +8 刻。
 *   关（贴影式）：出手更快、爪面宽 0.12 格、冷却更短，代价是威力 ×0.94、暗算与影痕略低。
 */
namespace PokemonSkills {
    export const shadowclawId = "shadowclaw";
    export const shadowclawScene = "world_combat:move_shadowclaw";
    export const shadowclawVitalText = "world_combat.move.shadowclaw.text.vital";
    export const shadowclawAmbushText = "world_combat.move.shadowclaw.text.ambush";
    export const shadowclawMissText = "world_combat.move.shadowclaw.text.miss";
    /** 表现里判定带的参考半宽（格）；服务端传 scale = 实际半宽 / 这个值。 */
    export const shadowclawReference = 0.55;

    actionParameters.define(shadowclawId, {
        /** 抓击威力：基础 70，物攻每比 60 多 1 加 0.2（夹 −12..28），体重每比 50 重 1 加 0.05（夹 −3..14）；
         *  深影 ×1.12 / 贴影 ×0.94；夹在 48..128。 */
        rend: formula(
            F.base(70).plus(F.stat("attack").minus(60).times(0.2).clamp(-12, 28))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-3, 14))
                .times(F.when(F.pref("deep"), F.const(1.12), F.const(0.94))).clamp(48, 128).round(1),
            "抓击威力", {
                unit: "威力",
                description: "影爪从背后抓进要害那一下的接触威力；物攻给出爪口，体重给出把它压下去的重量。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抓距：基础 2.6 格，速度每比 55 快 1 加 0.007（夹 −0.25..0.45）；夹 2.3..3.1。 */
        reach: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.25, 0.45)).clamp(2.3, 3.1).round(2),
            "抓距", {
                unit: "格",
                description: "影子先够到对手的正面距离，也是本招的实际射程；速度快的个体铺得更远。"
            }),
        /** 影铺距离：基础 1.1 格，体重每比 50 重 1 加 0.004（夹 −0.2..0.7），等级 30 起每级 +0.008（夹 −0.2..0.7）；
         *  深影 +0.6；夹 0.6..2.4。 */
        shade: formula(
            F.base(1.1).plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.7))
                .plus(F.level().minus(30).times(0.008).clamp(-0.2, 0.7))
                .plus(F.when(F.pref("deep"), F.const(0.6), F.const(0))).clamp(0.6, 2.4).round(2),
            "影铺距离", {
                unit: "格",
                description: "影子绕过对手、铺到它身后多远处出爪；身重的个体影子拖得更长，深影式再往前铺。"
            }),
        /** 爪面半宽：基础 0.55 格，碰撞箱每比 0.9 宽 1 加 0.3（夹 −0.1..0.35）；贴影 +0.12；夹 0.4..1.0。 */
        claw: formula(
            F.base(0.55).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.35))
                .plus(F.when(F.pref("deep"), F.const(0), F.const(0.12))).clamp(0.4, 1.0).round(2),
            "爪面半宽", {
                unit: "格",
                description: "暗带判定的横向半宽；身体越宽的个体爪面越宽。贴影式贴身出爪，爪面更宽。"
            }),
        /** 竖直覆盖：基础 1.5 格，身高每比 1.4 高 1 加 0.4（夹 −0.15..0.6）；夹 1.2..2.4。 */
        depth: formula(
            F.base(1.5).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.15, 0.6)).clamp(1.2, 2.4).round(2),
            "竖直覆盖", {
                unit: "格",
                description: "这一爪从脚下沿目标身体向上抓多高；高大的个体抓得更高。"
            }),
        /** 影痕时长：基础 60 刻，等级 30 起每级 +1.2（夹 −15..80）；深影 +30；夹 40..200。 */
        gouge: seconds(
            F.base(60).plus(F.level().minus(30).times(1.2).clamp(-15, 80))
                .plus(F.when(F.pref("deep"), F.const(30), F.const(0))).clamp(40, 200).round(0),
            "影痕时长", "命中处那道影痕留多久；等级越高留得越久，深影式再延长。"),
        /** 崩屑量：基础 18，物攻每比 55 多 1 加 0.3（夹 −4..28）；夹 14..46。 */
        shred: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 28)).clamp(14, 46).round(0),
            "崩屑量", {
                unit: "个",
                description: "命中处崩出的暗色碎屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 暗算加成：基础 0.35，等级 30 起每级 +0.001（夹 −0.05..0.12）；深影 +0.1；夹 0.2..0.55。 */
        ambush: percent(
            F.base(0.35).plus(F.level().minus(30).times(0.001).clamp(-0.05, 0.12))
                .plus(F.when(F.pref("deep"), F.const(0.1), F.const(0))).clamp(0.2, 0.55),
            "暗算加成", "对手当前正把注意力放在别人身上时，这一爪额外增加的伤害比例；等级越高越会挑没被看着的时机，深影式再高一档。"),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.03（夹 −2..3）；深影 +3 / 贴影 −2；夹 4..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("deep"), F.const(3), F.const(-2))).clamp(4, 15).round(0),
            "起手", "影先铺出去、爪再探出来之间的蓄势；速度越快越短，深影式更久。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 减 0.02（夹 −2..2）；深影 +2 / 贴影 −1；夹 4..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(-1))).clamp(4, 13).round(0),
            "收招", "抓完把影子收回脚下的时间；贴影式更干脆。"),
        /** 冷却：基础 32 刻，速度每比 55 快 1 减 0.05（夹 −4..7）；深影 +8 / 贴影 −5；夹 18..48。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("deep"), F.const(8), F.const(-5))).clamp(18, 48).round(0),
            "冷却", "再次铺影前的等待；深影式更长，贴影式更短。"),
        maxTargets: hidden(1)
    });

    defineDamage(shadowclawId, "rend", {}, { contact: true });

    stages(shadowclawId, [
        { level: 28, values: { rend: 82 } },
        { level: 46, values: { shade: 1.8, ambush: 0.42 } }
    ]);

    describe(shadowclawId, [
        { key: "description.0", values: ["rend"] },
        { key: "description.1", values: ["reach", "shade"] },
        { key: "description.2", values: ["ambush", "claw"] },
        { key: "description.3", values: ["gouge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rend"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shade", "tier.1.ambush"] }
    ]);
}
