/**
 * 电磁飘浮 / magnetrise 的参数与数值来源。
 *
 * 原生事实：Electric、Status、威力 —、命中 必中、PP 10、目标 self／volatile magnetrise，持续 5 回合，
 *   悬浮期间免疫地面（Ground）招式；在重力、扎根、击落之下无法起浮。
 * 核心念头：把脚下那块地磁化，用磁场把自己托离地面。身体浮起来之后，地面招式与脚下的地形危害都够不到它，
 *   贴身的敌人还会被同极的磁力弹开一步；磁力耗尽时身体失托落回地面。
 * 世界化：命中挂共享身份 world_combat:status/magnetrise 的真实 MobEffect（物品栏可见、/effect 可用），
 *   由本单元的入场伤害规则负责免疫与弹开；旁挂一枚机读标记带走画面与弹力要用的数值。
 *   磁铁是电做的：只对真正浮起来的人成立，持有黑色铁球（native 的接地物）时不生效。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   hoverTicks  基础 220 刻 + 等级 ×2 + 速度 ×0.5，夹 160..520；磁场能托住身体多久。
 *   fieldRadius 基础 0.7 格 + 体重 ×0.002，夹 0.5..1.5；脚下电场半径与弹开判定范围，越重磁力越厚。
 *   liftHeight  基础 0.35 格 + 身高 ×0.15，夹 0.25..0.8；身体离地的高度，画面也照它抬。
 *   sparks      基础 18 点 + 特攻 ×0.12 + 等级 ×0.3，夹 12..60；电弧数量，也驱动持续画面。
 *   repel       基础 0.35 格 + 体重 ×0.00125，夹 0.25..0.9；同极弹开贴地敌人的距离，越重弹得越开。
 *   glide       基础 12% + 速度 ×0.06%，夹 8%..30%；悬浮期间移速加成，越快的个体滑得越顺。
 *   tempo/aftercast/recharge 起手吃速度、收招吃速度、冷却吃速度，名字不与保留键冲突。
 * 配置 field 双向取舍：滑翔更轻快（移速 ×1.35、起手 −2、冷却 ×0.85）但磁场更短、弹力 ×0.7；
 *   锚定托得更久（时长 ×1.25、弹力 ×1.4、半径 ×1.15）但起手 +2、冷却 ×1.15 且不加移速。
 */
namespace PokemonSkills {
    export const magnetriseId = "magnetrise";
    export const magnetriseEffect = "world_combat:magnetrise_field";
    export const magnetriseMark = "world_combat:magnetrise_mark";
    export const magnetriseScene = "world_combat:move_magnetrise";
    export const magnetriseStatus = "magnetrise";
    export const magnetriseLiftText = "world_combat.move.magnetrise.text.lift";
    export const magnetriseNegateText = "world_combat.move.magnetrise.text.negate";
    export const magnetriseRepelText = "world_combat.move.magnetrise.text.repel";
    export const magnetriseSettleText = "world_combat.move.magnetrise.text.settle";
    export const magnetriseCutText = "world_combat.move.magnetrise.text.cut";
    /** 贴身弹开的判定范围（格），skill.ts 的入场规则与说明同源。 */
    export const magnetriseContactRange = 3.5;

    actionParameters.define(magnetriseId, {
        hoverTicks: seconds(
            F.base(220).plus(F.level().times(2)).plus(F.stat("speed").times(0.5)).clamp(160, 520).round(0),
            "悬浮时长", "磁场托住身体的时间；等级与速度让这道电托得更久。"),
        fieldRadius: formula(
            F.base(0.7).plus(F.body("weight").div(1200)).clamp(0.5, 1.5),
            "磁力半径", { unit: " 格", description: "脚下电场与弹开判定的半径；体重越大磁力越厚。" }),
        liftHeight: formula(
            F.base(0.35).plus(F.body("height").times(0.15)).clamp(0.25, 0.8),
            "悬浮高度", { unit: " 格", description: "身体离地的高度；身板越高抬得越高，画面也照它抬。" }),
        sparks: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.12)).plus(F.level().times(0.3)).clamp(12, 60).round(0),
            "电弧数量", { unit: " 点", description: "脚下电弧粒子的数量；特攻与等级越高电越密。" }),
        repel: formula(
            F.base(0.35).plus(F.body("weight").div(2000)).clamp(0.25, 0.9),
            "弹开距离", { unit: " 格", description: "同极弹开贴地近战敌人的距离；体重越大弹得越开。" }),
        glide: percent(
            F.base(0.12).plus(F.stat("speed").times(0.0006)).clamp(0.08, 0.30),
            "滑翔加速", "悬浮期间自己获得的移动速度加成；速度越高滑得越顺。"),
        tempo: seconds(F.base(12).minus(F.stat("speed").times(0.04)).clamp(7, 16).round(0), "起手",
            "把地面磁化、身体离地需要多久；速度越快越短。"),
        aftercast: seconds(F.base(6).minus(F.stat("speed").times(0.01)).clamp(3, 9).round(0), "收招",
            "离地之后的收势。"),
        recharge: seconds(F.base(160).minus(F.stat("speed").times(0.12)).clamp(90, 200).round(0), "冷却",
            "两次起浮之间的等待。")
    });
    describe(magnetriseId, [
        { key: "description.0", values: ["hoverTicks"] },
        { key: "description.1", values: ["repel"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "field.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.field === "glide"); } },
        { key: "field.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.field !== "glide"; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
