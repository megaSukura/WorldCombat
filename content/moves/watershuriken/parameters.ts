/**
 * 飞水手里剑 / watershuriken —— 参数与伤害段。
 *
 * 原生事实：水／**特殊**／威力 15／命中 100／PP 20／优先度 +1／连续攻击 2～5 次，无接触（Cobblemon 1.8，2 位学习者）。
 *   描述「用粘液制成的手里剑，连续攻击２～５次。必定能够先制攻击」。
 *
 * 翻译：把「先制」与「连续 2～5 次」翻成**甩出一串水做的手里剑**：起手在掌中搓出旋转的水盘，随后按固定 `gap`
 *   一刻一枚沿直线切向目标；每枚独立结算一次 `shuriken` 特殊伤害并挂上短暂的浇透。前一枚还没消失，后一枚也照原节拍
 *   出手，所以数枚可以同时在空中，最后所有飞行结束才统一收势。命中几枚由精灵数据决定（等级、特攻、速度），
 *   所以两只精灵甩出的枚数可以在场上看出不同，而不是纯掷骰。选取用 `kind: "aim"`：朝方向或世界点都能甩，
 *   提交方向在出手瞬间定下，不再自动追锁旧对象。它是全族唯一的特殊招与唯一的连发水星。
 *   与最像的岩石爆击分开：岩石是弧线、物理、砸地留碎石；飞水手里剑是直线、特殊、水星旋转，飞行更快、不碰地面。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   shuriken 单枚威力：特攻给水刃的锋、速度给甩出的转速；聚式每枚 ×1.3，散式 ×0.85。
 *   stars    枚数：等级、特攻与速度共同决定甩几枚（2～5）；聚式 −1 枚，散式 +1 枚。
 *   reach    射程：特攻与等级决定水星能甩多远。
 *   velocity 飞行速度：速度决定水星多快。
 *   radius   判定半径：身高决定水星多宽。
 *   spread   散布角度：速度决定甩得多齐；聚式 ×0.6。
 *   gap      连发间隔：速度决定两枚之间隔多久；聚式多 1 刻。
 *   drench   浇透时长：等级与特攻决定水在身上挂多久。
 *   sparks   水花数量：特攻驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定起手、收招与冷却；聚式更慢更费。
 *
 * 配置 `focused`（聚式）双向取舍：开启＝枚数 −1（最少 2）、每枚 ×1.3、散布 ×0.6、更准更重，但连发间隔 +1 刻、
 *   收招 +2、冷却 +6；关闭（散式）＝枚数 +1（最多 5）、每枚 ×0.85、散布更开、回得更快。一个换「少而重」，
 *   一个换「多而密」。两者都随精灵数据变化。
 *
 * 伤害段 `shuriken` 与参数同名，类别沿用原生特殊；对手防御、相性与暴击在命中时统一结算。
 * 浇透复用共享身份 soaked 与自己的载体 `world_combat:watershuriken_soaked`（startup.ts，identity_only）。
 */
namespace PokemonSkills {
    export const watershurikenId = "watershuriken";
    export const watershurikenScene = "world_combat:move_watershuriken";
    export const watershurikenSoakedEffect = "world_combat:watershuriken_soaked";
    export const watershurikenHitText = "world_combat.move.watershuriken.text.hit";
    export const watershurikenTallyText = "world_combat.move.watershuriken.text.tally";
    export const watershurikenMissText = "world_combat.move.watershuriken.text.miss";

    actionParameters.define(watershurikenId, {
        /** 单枚威力：15 +（特攻 − 55）× 0.16 [−4,18] +（速度 − 55）× 0.06 [−2,8]；聚式 ×1.3／散式 ×0.85；夹 10..36。 */
        shuriken: formula(
            F.base(15)
                .plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-4, 18))
                .plus(F.stat("speed").minus(55).times(0.06).clamp(-2, 8))
                .times(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(1.3), F.const(0.85)))
                .clamp(10, 36).round(1),
            "单枚威力", {
                base: 15, unit: "威力",
                description: "每一枚水手里剑切中的威力（特殊结算）；特攻给水刃的锋、速度给甩出的转速。聚式每枚更重、散式更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 枚数：3 +（等级 − 30）× 0.02 [−0.5,0.7] +（速度 − 55）× 0.01 [−0.3,0.5] +（特攻 − 55）× 0.01 [−0.3,0.5] + 聚 −1／散 +1；夹 2..5。 */
        stars: formula(
            F.base(3)
                .plus(F.level().minus(30).times(0.02).clamp(-0.5, 0.7))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.5))
                .plus(F.stat("specialAttack").minus(55).times(0.01).clamp(-0.3, 0.5))
                .plus(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(-1), F.const(1)))
                .clamp(2, 5).round(0),
            "手里剑枚数", {
                base: 3, unit: "枚",
                description: "这一轮甩出几枚水手里剑（各自独立结算）；等级、特攻与速度越高甩得越多，聚式少一枚、散式多一枚，始终在 2～5 枚。"
            }),
        /** 射程：10 +（特攻 − 55）× 0.03 [−0.8,1.5] +（等级 − 30）× 0.04 [−0.4,0.8]；夹 8..15。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(55).times(0.03).clamp(-0.8, 1.5))
                .plus(F.level().minus(30).times(0.04).clamp(-0.4, 0.8)).clamp(8, 15).round(2),
            "射程", {
                base: 10, unit: "格",
                description: "水星最远能甩到哪，也是本招的实际射程来源；特攻与等级越高甩得越远。"
            }),
        /** 飞行速度：1.6 +（速度 − 55）× 0.012 [−0.2,0.8]；夹 1.2..2.6。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.8)).clamp(1.2, 2.6).round(2),
            "飞行速度", { base: 1.6, unit: "格/刻", description: "每一枚水星飞行的速度；速度快的个体甩得更急，目标更难让开。" }),
        /** 判定半径：0.35 +（身高 − 1.4）× 0.05 [−0.03,0.12]；夹 0.25..0.50。 */
        radius: formula(
            F.base(0.35).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.12)).clamp(0.25, 0.50).round(2),
            "判定半径", { base: 0.35, unit: "格", description: "每一枚水星的横向判定半径；身板越大甩出的水盘越宽。" }),
        /** 散布角度：4.5 −（速度 − 55）× 0.02 [−0.5,2]；聚式 ×0.6；夹 1..8。 */
        spread: formula(
            F.base(4.5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 2))
                .times(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(0.6), F.const(1)))
                .clamp(1, 8).round(2),
            "散布角度", {
                base: 4.5, unit: "度",
                description: "几枚水星彼此偏开多少；速度越快甩得越齐，聚式收得更紧。散布越大越容易漏掉移动中的目标。"
            }),
        /** 连发间隔：4 −（速度 − 55）× 0.02 [−0.6,1.2] + 聚 1；夹 2..6 刻。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.2))
                .plus(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(1), F.const(0)))
                .clamp(2, 6).round(0),
            "连发间隔", "两枚水星之间隔多久甩出；速度越快连得越密，聚式多留半拍瞄准。"),
        /** 浇透时长：40 +（等级 − 20）× 0.5 [0,25] +（特攻 − 55）× 0.05 [−2,16]；夹 30..100 刻。 */
        drench: seconds(
            F.base(40).plus(F.level().minus(20).times(0.5).clamp(0, 25))
                .plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-2, 16)).clamp(30, 100).round(0),
            "浇透时长", "被水星切中后湿身（共享身份 soaked）挂多久；后一枚会刷新时长，等级与特攻越高挂得越久。"),
        /** 水花数量：16 +（特攻 − 55）× 0.20 [−4,16]；夹 12..40。 */
        sparks: formula(
            F.base(16).plus(F.stat("specialAttack").minus(55).times(0.20).clamp(-4, 16)).clamp(12, 40).round(0),
            "水花数量", {
                base: 16, unit: "点",
                description: "每枚水星命中时溅起的水花数量，也直接驱动画面的发射量；特攻越高水花越密。"
            }),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 1..5 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(1, 5).round(0),
            "起手", "在掌中搓出第一枚水盘的时间；先制招几乎一搓就出手。"),
        /** 收招：7 −（速度 − 55）× 0.02 [−0.8,1.5] + 聚 2；夹 4..12 刻。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "收招", "一轮甩完、手收回来的时间；聚式多留一点余势。"),
        /** 冷却：20 −（速度 − 55）× 0.06 [−1.5,2.5] + 聚 6；夹 12..32 刻。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.06).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("focused", text("worldcombat.skill.watershuriken.preference.focused")), F.const(6), F.const(0)))
                .clamp(12, 32).round(0),
            "冷却", "两轮水星之间的等待；散式回得快，聚式要重新聚水。")
    });

    defineDamage(watershurikenId, "shuriken", {});

    stages(watershurikenId, [
        { level: 20, values: { shuriken: 18 } },
        { level: 38, values: { shuriken: 24, reach: 11 } }
    ]);

    describe(watershurikenId, [
        { key: "description.0", values: ["shuriken","radius"] },
        { key: "description.1", values: ["stars","gap"] },
        { key: "description.2", values: ["reach", "velocity", "spread"] },
        { key: "description.3", values: ["drench"] },
        { key: "focused.on", values: [], when: function (context) { return read(context.detail.values, ["focused"]) === true; } },
        { key: "focused.off", values: [], when: function (context) { return read(context.detail.values, ["focused"]) !== true; } },
        { key: "timing", values: ["reach", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shuriken"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shuriken", "tier.1.reach"] }
    ]);
}
