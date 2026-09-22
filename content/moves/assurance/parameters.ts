/**
 * 恶意追击 / assurance —— 参数、伤害段与「对手已经受伤」的现场判读。
 *
 * 原生事实：Dark／物理／威力 60／命中 100／PP 10／接触；
 *   「如果此回合内对手已经受到伤害的话，招式威力会变成 2 倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗没有回合，本招把「本回合内对手已经受到伤害」落成**目标在最近 window 内被任何来源打过**
 *   （`world.observe(target).hurtAgo() <= window`）。看准别人（或自己前一记）刚撕开的伤口追上去补一击：
 *   目标带伤时这一记翻倍。它读的是**目标**的伤，不是自己的。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   ambush   追击威力 56 + 物攻偏移 + 速度偏移；目标带伤时 ×2，穷追式 ×0.90。
 *   window   追击窗口 1.8 秒 − 速度偏移 + 穷追 0.6 秒（反应快的个体只认眼前的新伤）。
 *   dash     追逐距离 3.2 格 + 速度偏移 + 等级偏移；也是实际射程来源。
 *   speed    每刻位移 0.82 格/刻 + 速度偏移。
 *   radius   判定半径 0.40 格 + 体型高度偏移。
 *   push     顶开 0.30 格 + 物攻偏移。
 *   quills   暗羽数 12 + 物攻偏移 + 速度偏移，驱动表现。
 *   grit／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 `relentless`（穷追）：开启＝窗口更长 +0.6 秒、追得更远 ×1.08，但本击 ×0.90、冷却更久；
 *   关闭＝本击 ×1.06、更利落。两向各有局面：缠住带伤目标 vs 一记了结。
 */
namespace PokemonSkills {
    export const assuranceId = "assurance";
    export const assuranceScene = "world_combat:move_assurance";
    export const assuranceAmbushText = "world_combat.move.assurance.text.ambush";
    export const assuranceHitText = "world_combat.move.assurance.text.hit";
    export const assuranceMissText = "world_combat.move.assurance.text.miss";

    /** 命中目标是否在追击窗口内受过伤（任何来源）；1 即可乘之机。 */
    export function assuranceWounded(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor)) return 0;
        const target = context.action ? context.action.target() : context.target ? context.target.actor || null : null;
        if (!target || !world.valid(target)) return 0;
        const body = world.observe(target);
        if (body === null) return 0;
        const window = p(assuranceId, "window", <NumberContext>context);
        return body.hurtAgo() <= window ? 1 : 0;
    }

    defineFacts(assuranceId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "assurance.wounded") return assuranceWounded(context);
            return undefined;
        } };
    });

    actionParameters.define(assuranceId, {
        /** 追击威力：56 + 物攻偏移[−14,34] + 速度偏移[−4,16]；目标带伤 ×2、穷追式 ×0.90 / 常规 ×1.06；夹 34..150。 */
        ambush: formula(
            F.base(56)
                .plus(F.stat("attack").minus(58).times(0.30).clamp(-14, 34))
                .plus(F.stat("speed").minus(58).times(0.12).clamp(-4, 16))
                .times(F.when(F.var("assurance.wounded", text("worldcombat.skill.assurance.value.wounded")).gt(0), F.const(2), F.const(1)))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.assurance.preference.relentless")), F.const(0.90), F.const(1.06)))
                .clamp(34, 150).round(1),
            "追击威力", {
                unit: "威力",
                description: "这一记追击的基准威力；物攻越高越重、出手越快越准。目标在窗口内已被打过时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 追击窗口：36 刻（1.8 秒）− 速度偏移[−6,10 刻] + 穷追 12 刻；夹 24..60 刻。 */
        window: seconds(
            F.base(36).minus(F.stat("speed").minus(58).times(0.12).clamp(-6, 10))
                .plus(F.when(F.pref("relentless", text("worldcombat.skill.assurance.preference.relentless")), F.const(12), F.const(0))).clamp(24, 60).round(0),
            "追击窗口", "目标在这段时间内受到过伤害，这一记就翻倍；反应快的个体只认眼前的新伤，穷追式把窗口拉长。"),
        /** 追逐距离：3.2 格 + 速度偏移[−0.6,1.6] + 等级偏移[0,1.0]；穷追式 ×1.08；夹 2.6..5.4。 */
        dash: formula(
            F.base(3.2).plus(F.stat("speed").minus(58).times(0.016).clamp(-0.6, 1.6))
                .plus(F.level().minus(28).times(0.03).clamp(0, 1.0))
                .times(F.when(F.pref("relentless", text("worldcombat.skill.assurance.preference.relentless")), F.const(1.08), F.const(1.0)))
                .clamp(2.6, 5.4).round(2),
            "追逐距离", {
                unit: "格",
                description: "朝带伤目标追出去的最大距离，也是本招的实际射程来源；腿快的个体追得更远。"
            }),
        /** 每刻位移：0.82 格/刻 + 速度偏移[−0.15,0.35]；夹 0.62..1.30。 */
        speed: formula(
            F.base(0.82).plus(F.stat("speed").minus(58).times(0.0035).clamp(-0.15, 0.35)).clamp(0.62, 1.30).round(2),
            "追击速度", {
                unit: "格/刻",
                description: "扑上去每刻移动的距离；越快越难在伤口合上之前被躲开。"
            }),
        /** 判定半径：0.40 格 + 体型高度偏移[−0.08,0.30]；夹 0.32..0.72。 */
        radius: formula(
            F.base(0.40).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.08, 0.30)).clamp(0.32, 0.72).round(2),
            "判定半径", {
                unit: "格",
                description: "追击能咬住多大一圈；身板大的个体扑得更宽。"
            }),
        /** 顶开：0.30 格 + 物攻偏移[−0.08,0.35]；夹 0.20..0.70。 */
        push: formula(
            F.base(0.30).plus(F.stat("attack").minus(58).times(0.004).clamp(-0.08, 0.35)).clamp(0.20, 0.70).round(2),
            "顶开", {
                unit: "格",
                description: "命中后把目标撞开的距离；物攻高的个体顶得更远。"
            }),
        /** 暗羽数：12 + 物攻偏移[−3,24] + 速度偏移[−2,10]；夹 8..38。 */
        quills: formula(
            F.base(12).plus(F.stat("attack").minus(58).times(0.18).clamp(-3, 24))
                .plus(F.stat("speed").minus(58).times(0.12).clamp(-2, 10)).clamp(8, 38).round(0),
            "暗羽数", {
                unit: "枚",
                description: "追击时拖出的暗羽数量；物攻与速度越高越密，直接驱动画面的发射量。"
            }),
        /** 起手：4 刻 − 速度偏移[−1,2] + 穷追 2 刻；夹 3..8。 */
        grit: seconds(
            F.base(4).minus(F.stat("speed").minus(58).times(0.018).clamp(-1, 2))
                .plus(F.when(F.pref("relentless", text("worldcombat.skill.assurance.preference.relentless")), F.const(2), F.const(0))).clamp(3, 8).round(0),
            "起手", "从锁定伤口到扑出去之间的时间；速度快的个体起得更快，穷追式先压低身形。"),
        /** 收招：6 刻；夹 4..10。 */
        settle: seconds(F.base(6).clamp(4, 10).round(0), "收招", "追击结束后收住的时间。"),
        /** 冷却：26 − 速度偏移[−4,6] + 穷追 5；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(58).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("relentless", text("worldcombat.skill.assurance.preference.relentless")), F.const(5), F.const(0))).clamp(18, 40).round(0),
            "冷却", "这一记追击之后多久能再扑一次；速度快的个体回得更快，穷追式更费。"),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    defineDamage(assuranceId, "ambush", {}, { contact: true });

    stages(assuranceId, [
        { level: 28, values: { ambush: 70 } },
        { level: 44, values: { ambush: 82, dash: 3.8 } }
    ]);

    describe(assuranceId, [
        { key: "description.0", values: ["ambush", "window"] },
        { key: "description.1", values: ["dash", "speed", "radius", "push", "quills"] },
        { key: "relentless.on", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) === true; } },
        { key: "relentless.off", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) !== true; } },
        { key: "timing", values: ["range", "grit", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ambush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ambush", "tier.1.dash"] }
    ]);
}
