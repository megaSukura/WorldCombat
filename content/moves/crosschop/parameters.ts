/**
 * 十字劈 / crosschop —— 参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 100／命中 80／PP 5／接触／critRatio 2（Cobblemon 1.8，29 位学习者）。
 * 原生描述：「用两手呈十字劈打对手进行攻击，容易击中要害」。
 *
 * 翻译：把「两手呈十字劈打」落成**两次从相反斜上方劈向同一点的斩击**：第一劈把对手的架势撞开，第二劈顺着同一个
 *   交叉点切下去——两劈在一个很短的间隔里先后结算，先劈得手第二劈才带「破势」加成。它是本组唯一的贴身双击，
 *   靠「两劈之间对手还在不在短射程里」决定第二劈落不落；原生的 80 命中在这里就是这半步的判定。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   chop       每劈威力：物攻定手劲，等级定火候。
 *   seam       破势加成：物攻决定第二劈对已被第一劈劈中的目标多切几分（破势式再抬一档）。
 *   reach      出手距离：速度与身高决定两臂能劈到多近；很短。
 *   spread     交叉幅度：碰撞箱宽度决定两道斜线张开多大（画面里的 X 有多大）。
 *   gap        两劈间隔：速度决定第一劈到第二劈之间隔几刻。
 *   tempo／aftercast／recharge 时序：速度决定起手、收招与冷却；破势式更慢更缓。
 *
 * 配置 guard（破势）：开启＝第二劈的破势加成 ×1.35（第一劈撞开架势后第二劈切得更深），代价是出手距离 ×0.95、
 *   两劈间隔 +1 刻、起手 +3 刻、冷却 +6 刻；关闭＝双劈式，两劈等重、出手距离 ×1.08、起手更快，代价是没有破势加成。
 *
 * 伤害段 chop：每一次劈中的那一下（接触）；第二劈在命中且第一劈得手时以 (1 + seam) 放大同一段。
 */
namespace PokemonSkills {
    export const crosschopId = "crosschop";
    export const crosschopScene = "world_combat:move_crosschop";
    export const crosschopCrossText = "world_combat.move.crosschop.text.cross";
    export const crosschopBreakText = "world_combat.move.crosschop.text.break";
    export const crosschopMissText = "world_combat.move.crosschop.text.miss";

    actionParameters.define(crosschopId, {
        /** 每劈威力：基础 46，物攻每比 60 多 1 加 0.16（夹 -8..20），等级每比 30 高 1 加 0.18（夹 -5..10）；夹在 30..74。 */
        chop: formula(
            F.base(46).plus(F.stat("attack").minus(60).times(0.16).clamp(-8, 20))
                .plus(F.level().minus(30).times(0.18).clamp(-5, 10))
                .clamp(30, 74).round(1),
            "每劈威力", {
                unit: "威力",
                description: "每一劈劈在对手身上的基础威力；两劈先后结算，第二劈若在第一劈得手后命中再乘破势加成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 破势加成：基础 0.34，物攻每比 60 多 1 加 0.0012（夹 0.18..0.5）；破势式 ×1.35 / 双劈式 ×0。 */
        seam: percent(
            F.base(0.34).plus(F.stat("attack").minus(60).times(0.0012)).clamp(0.18, 0.5)
                .times(F.when(F.pref("guard"), F.const(1.35), F.const(0))),
            "破势加成", "第一劈撞开架势后，第二劈对这一目标额外增加的伤害比例；双劈式没有这项加成。"),
        /** 出手距离：基础 2.4 格，速度每比 55 快 1 加 0.008（夹 -0.1..0.25），身高每比 1.4 高 1 加 0.06（夹 -0.1..0.2）；破势 ×0.95 / 双劈 ×1.08；夹在 2.1..3.2。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.1, 0.25))
                .plus(F.body("height").minus(1.4).times(0.06).clamp(-0.1, 0.2))
                .times(F.when(F.pref("guard"), F.const(0.95), F.const(1.08)))
                .clamp(2.1, 3.2).round(2),
            "出手距离", {
                unit: "格",
                description: "两臂能劈到多近；速度与身高决定伸展范围，第二劈要在这个距离内才落得下。它也是本招的实际射程来源。"
            }),
        /** 交叉幅度：基础 0.55 格，碰撞箱每比 0.9 宽 1 加 0.3（夹 -0.1..0.45）；夹在 0.45..1.0。 */
        spread: formula(
            F.base(0.55).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.45)).clamp(0.45, 1.0).round(2),
            "交叉幅度", {
                unit: "格",
                description: "两道斜线在落点张开的半宽；身体越宽的个体把 X 张得越大，画面里的交叉就有多开。"
            }),
        /** 两劈间隔：基础 5 刻，速度每比 55 快 1 减 0.03（夹 -1..2），破势 +1；夹在 2..7。 */
        gap: formula(
            F.base(5).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("guard"), F.const(1), F.const(0))).clamp(2, 7).round(0),
            "两劈间隔", {
                unit: "刻",
                description: "第一劈到第二劈之间隔几刻；速度越快收得越紧，破势式多留一瞬把架势撞开。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.03（夹 -1.5..3），破势 +3；夹在 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3))
                .plus(F.when(F.pref("guard"), F.const(3), F.const(0))).clamp(5, 13).round(0),
            "起手", "双臂交叉蓄势的时间；速度越快越短，破势式多花一点。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.02（夹 -1..2）；夹在 4..10。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "劈完收回双臂的时间。"),
        /** 冷却：基础 30 刻，速度每比 55 快 1 减 0.06（夹 -2..4），破势 +6；夹在 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.06).clamp(-2, 4))
                .plus(F.when(F.pref("guard"), F.const(6), F.const(0))).clamp(18, 44).round(0),
            "冷却", "再次交叉劈前的等待；破势式缓得更久。")
    });

    defineDamage(crosschopId, "chop", {}, { contact: true });

    stages(crosschopId, [
        { level: 28, values: { chop: 56 } },
        { level: 46, values: { chop: 64, reach: 2.8 } }
    ]);

    describe(crosschopId, [
        { key: "description.0", values: ["chop"] },
        { key: "description.1", values: ["seam", "gap"] },
        { key: "description.2", values: ["reach"] },
        { key: "stance.guard", values: [], when: function (context) { return read(context.detail.values, ["guard"]) === true; } },
        { key: "stance.double", values: [], when: function (context) { return read(context.detail.values, ["guard"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.chop"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.chop", "tier.1.reach"] }
    ]);
}
