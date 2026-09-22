/**
 * 以牙还牙 / payback —— 参数与伤害段。
 *
 * 原生事实：Dark／物理／威力 50／命中 100／PP 10／接触；「如果能在对手之后攻击，威力翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有先手判定，本实现把「在对手之后出手」翻成可观察的事实——命中那一刻，
 * 目标在最近一段窗口内打过施法者，或此刻正朝施法者出手。满足时这一记回击翻倍。
 * 与原生「蓄力攻击」相配的另一条：施法者越是带伤，这一记把郁结得越重（缺的血打进威力）。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   payback     回击威力 50 + 物攻偏移 + 郁结（缺失生命比例 × 系数）；满足后手条件时 ×2。
 *   grievance   郁结系数 40/55（蓄势配置），吃施法者当前缺失生命比例[0,1]。
 *   window      反算窗口 32 刻（1.6 秒）− 速度偏移[−6,10] + 蓄势 16 刻（快手只惩罚眼前的反击）。
 *   dash        扑击距离 2.6 格 + 速度偏移 + 等级偏移。
 *   speed       每刻位移 0.7 格/刻 + 速度偏移。
 *   collisionRadius 判定半径 0.42 格 + 体型高度偏移。
 *   push        击退 0.35 格 + 物攻偏移。
 *   grit        起手 4 刻 − 速度偏移 + 蓄势 3 刻。
 *   settle      收招 7 刻。
 *   recharge    冷却 30 刻 − 速度偏移 + 蓄势 6 刻。
 *
 * 配置 `patient`（蓄势以待）：开启＝反算窗口更长、郁结系数更高，但起手与冷却更长；
 *   关闭＝反应更快、窗口更短，只在对手贴脸出手时翻倍。
 *
 * 伤害段 `payback` 与参数同名，走共享换算（原生类别 Physical，Dark 属性）。
 */
namespace PokemonSkills {
    export const paybackId = "payback";
    export const paybackScene = "world_combat:move_payback";

    /** 命中目标是否已经先动过手：最近 window 刻内打过施法者，或此刻正朝施法者出手。 */
    export function paybackReckoning(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return 0;
        const target = context.target && context.target.actor ? context.target.actor : context.action ? context.action.target() : null;
        if (!target || !world.valid(target) || world.friendly(target)) return 0;
        const window = p(paybackId, "window", <NumberContext>context);
        const self = world.observe(actor), foe = world.observe(target);
        if (self === null) return 0;
        const last = self.lastAttacker();
        if (self.hurtAgo() <= window && last !== null && String(last.ref()) === String(target.ref())) return 1;
        if (foe !== null) {
            const swinging = foe.attacking();
            if (swinging !== null && String(swinging.ref()) === String(actor.ref())) return 1;
        }
        return 0;
    }

    defineFacts(paybackId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id === "payback.recent") return paybackReckoning(context);
            if (id === "payback.stored") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                const body = context.world.observe(context.actor);
                if (body === null || body.maxHealth() <= 0) return undefined;
                const missing = Math.max(0, Math.min(1, 1 - body.health() / body.maxHealth()));
                return missing * p(paybackId, "grievance", <NumberContext>context);
            }
            return undefined;
        } };
    });

    actionParameters.define(paybackId, {
        /** 回击威力：50 + 物攻偏移[−16,34] + 郁结（缺失生命 × 郁结系数）；后手命中 ×2；夹 30..150。 */
        payback: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.26).clamp(-16, 34))
                .plus(F.var("payback.stored", text("worldcombat.skill.payback.value.grievance")))
                .times(F.when(F.var("payback.recent", text("worldcombat.skill.payback.value.reckoning")).gt(0), F.const(2), F.const(1)))
                .clamp(30, 150).round(1),
            "回击威力", {
                base: 50, unit: "威力",
                description: "这一记回击的基准威力；物攻越高越重，自己缺的血越多、郁结越深。目标在窗口内先动过手时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 反算窗口：32 刻（1.6 秒）− 速度偏移[−6,10] + 蓄势 16 刻；夹 20..60 刻。 */
        window: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.12).clamp(-6, 10))
                .plus(F.when(F.pref("patient"), F.const(16), F.const(0))).clamp(20, 60).round(0),
            "反算窗口", "目标在这段时间内打过施法者，或此刻正朝施法者出手，就触发翻倍；蓄势式把窗口拉长。"),
        /** 扑击距离：2.6 格 + 速度偏移[−0.5,1.4] + 等级偏移[0,1.2]；夹 2..5。 */
        dash: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.5, 1.4))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.2)).clamp(2, 5).round(2),
            "扑击距离", {
                base: 2.6, unit: "格",
                description: "迎上前打出的最大距离，也是本招的实际射程来源；腿快的个体够得到更远的目标。"
            }),
        /** 每刻位移：0.7 格/刻 + 速度偏移[−0.12,0.35]；夹 0.5..1.3。 */
        speed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.0035).clamp(-0.12, 0.35)).clamp(0.5, 1.3).round(2),
            "扑击速度", {
                unit: "格/刻",
                description: "冲上去每刻移动的距离；越快越能在对手再次出手前把这一记打出去。"
            }),
        /** 判定半径：0.42 格 + 体型高度偏移[−0.08,0.28]；夹 0.35..0.75。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.08, 0.28)).clamp(0.35, 0.75).round(2),
            "判定半径", {
                unit: "格",
                description: "回击能咬住多大一圈；身板大的个体出手更宽。"
            }),
        /** 击退：0.35 格 + 物攻偏移[−0.08,0.4]；夹 0.25..0.8。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.4)).clamp(0.25, 0.8).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标顶开的距离；物攻高的个体把对手推得更远。"
            }),
        /** 郁结系数：蓄势 55 / 常规 40。 */
        grievance: formula(
            F.when(F.pref("patient"), F.const(55), F.const(40)).clamp(30, 60).round(0),
            "郁结系数", { description: "缺失生命比例乘上这个系数就是郁结带来的额外威力；蓄势式把这份怒气留得更久。" }),
        /** 起手：4 刻 − 速度偏移[−1,2] + 蓄势 3 刻；夹 3..9。 */
        grit: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("patient"), F.const(3), F.const(0))).clamp(3, 9).round(0),
            "起手", "从收势到出手之间的时间；速度快的个体更快打出，蓄势式先沉住气。"),
        /** 收招：7 刻；打完站定。 */
        settle: seconds(F.base(7).clamp(4, 12).round(0), "收招", "回击结束后收住的时间。"),
        /** 冷却：30 − 速度偏移[−4,6] + 蓄势 6；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("patient"), F.const(6), F.const(0))).clamp(20, 44).round(0),
            "冷却", "这一次回击之后多久能再攒起一次；速度快的个体回得更快，蓄势式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(paybackId, "payback", {}, { contact: true });

    stages(paybackId, [
        { level: 30, values: { payback: 62 } },
        { level: 45, values: { payback: 74, dash: 3.3 } }
    ]);

    describe(paybackId, [
        { key: "description.0", values: ["payback", "window"] },
        { key: "description.1", values: ["dash", "speed", "collisionRadius", "push", "grievance"] },
        { key: "patient.on", values: [], when: function (context) { return read(context.detail.values, ["patient"]) === true; } },
        { key: "patient.off", values: [], when: function (context) { return read(context.detail.values, ["patient"]) !== true; } },
        { key: "timing", values: ["range", "grit", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.payback"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.payback", "tier.1.dash"] }
    ]);
}
