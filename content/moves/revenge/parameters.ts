/**
 * 报复 / revenge —— 参数、伤害段与「这个对手刚打过我」的现场判读。
 *
 * 原生事实：Fighting／物理／威力 60／命中 100／PP 10／接触／优先度 −4；
 *   「如果受到对手的招式攻击，就能给予对手 2 倍的伤害」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有先后手，本招把「受到这个对手的招式攻击」落成**施法者最近 window 内被**
 *   **当前目标**打过（`world.observe(self).hurtAgo() <= window` 且 `lastAttacker` 就是目标）。
 *   站定、握拳、把这口刚吃下的气原样打回去；是目标本人下的手才翻倍，别人打你、你打别人都不算。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   retort   报复威力 58 + 物攻偏移 + 等级偏移；被这个对手打过时 ×2，硬扛式 ×0.92。
 *   window   记仇窗口 2.2 秒 − 速度偏移 + 硬扛 0.8 秒（快的个体只记得眼前这一下）。
 *   reach    出拳距离 2.6 格 + 物攻偏移；也是实际射程来源，短而直。
 *   step     每刻位移 0.90 格/刻 + 速度偏移。
 *   radius   判定半径 0.34 格 + 体型高度偏移。
 *   push     顶开 0.60 格 + 物攻偏移（把贴脸的对手一拳送开）。
 *   smash    拳风粒子数 12 + 物攻偏移 + 等级偏移，驱动表现。
 *   tempo／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 `endure`（硬扛）：开启＝记仇更久 +0.8 秒、击退 ×1.20，但本击 ×0.92、起手 +2 刻、冷却 +6；
 *   关闭＝本击 ×1.06、出拳更快。两向各有局面：站住等这一口 vs 立刻还手。
 */
namespace PokemonSkills {
    export const revengeId = "revenge";
    export const revengeScene = "world_combat:move_revenge";
    export const revengeRetortText = "world_combat.move.revenge.text.retort";
    export const revengeHitText = "world_combat.move.revenge.text.hit";
    export const revengeMissText = "world_combat.move.revenge.text.miss";

    /** 施法者是否最近被当前目标本人打过；1 即这口仇能翻倍。 */
    export function revengeGrudge(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor)) return 0;
        const target = context.action ? context.action.target() : context.target ? context.target.actor || null : null;
        if (!target || !world.valid(target)) return 0;
        const self = world.observe(actor);
        if (self === null) return 0;
        if (self.hurtAgo() > p(revengeId, "window", <NumberContext>context)) return 0;
        const last = self.lastAttacker();
        return last !== null && String(last.ref()) === String(target.ref()) ? 1 : 0;
    }

    defineFacts(revengeId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "revenge.grudge") return revengeGrudge(context);
            return undefined;
        } };
    });

    actionParameters.define(revengeId, {
        /** 报复威力：58 + 物攻偏移[−14,34] + 等级偏移[−4,10]；被这个对手打过 ×2、硬扛式 ×0.92 / 常规 ×1.06；夹 34..150。 */
        retort: formula(
            F.base(58)
                .plus(F.stat("attack").minus(58).times(0.30).clamp(-14, 34))
                .plus(F.level().minus(28).times(0.35).clamp(-4, 10))
                .times(F.when(F.var("revenge.grudge", text("worldcombat.skill.revenge.value.grudge")).gt(0), F.const(2), F.const(1)))
                .times(F.when(F.pref("endure", text("worldcombat.skill.revenge.preference.endure")), F.const(0.92), F.const(1.06)))
                .clamp(34, 150).round(1),
            "报复威力", {
                unit: "威力",
                description: "这一记回拳的基准威力；物攻与等级越高越重。若最近被当前目标本人打过，威力翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 记仇窗口：44 刻（2.2 秒）− 速度偏移[−8,16 刻] + 硬扛 16 刻；夹 32..72 刻。 */
        window: seconds(
            F.base(44).minus(F.stat("speed").minus(58).times(0.08).clamp(-8, 16))
                .plus(F.when(F.pref("endure", text("worldcombat.skill.revenge.preference.endure")), F.const(16), F.const(0))).clamp(32, 72).round(0),
            "记仇窗口", "这个对手在这段时间内打过施法者，这一记就翻倍；快的个体只记得眼前这一下，硬扛式记更久。"),
        /** 出拳距离：2.6 格 + 物攻偏移[−0.3,1.0]；夹 2.2..4.0；也是实际射程来源。 */
        reach: formula(
            F.base(2.6).plus(F.stat("attack").minus(58).times(0.012).clamp(-0.3, 1.0)).clamp(2.2, 4.0).round(2),
            "出拳距离", {
                unit: "格",
                description: "站定后一拳能够到的最大距离，也是本招的实际射程来源；臂力大的个体够得更前。"
            }),
        /** 每刻位移：0.90 格/刻 + 速度偏移[−0.15,0.35]；夹 0.65..1.35。 */
        step: formula(
            F.base(0.90).plus(F.stat("speed").minus(58).times(0.0035).clamp(-0.15, 0.35)).clamp(0.65, 1.35).round(2),
            "出拳速度", {
                unit: "格/刻",
                description: "递拳时每刻移动的距离；越快越能在对手收招前打回去。"
            }),
        /** 判定半径：0.34 格 + 体型高度偏移[−0.08,0.28]；夹 0.28..0.62。 */
        radius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.08, 0.28)).clamp(0.28, 0.62).round(2),
            "判定半径", {
                unit: "格",
                description: "这一拳能咬住多大一圈；身板大的个体拳面更宽。"
            }),
        /** 顶开：(0.60 + 物攻偏移[−0.1,0.5]) × 硬扛 1.20；夹 0.35..1.15。 */
        push: formula(
            F.base(0.60).plus(F.stat("attack").minus(58).times(0.006).clamp(-0.1, 0.5))
                .times(F.when(F.pref("endure", text("worldcombat.skill.revenge.preference.endure")), F.const(1.20), F.const(1.0)))
                .clamp(0.35, 1.15).round(2),
            "顶开", {
                unit: "格",
                description: "命中后把贴脸的对手一拳送开的距离；物攻高的个体推得更远。"
            }),
        /** 拳风数：12 + 物攻偏移[−3,26] + 等级偏移[−2,6]；夹 9..40。 */
        smash: formula(
            F.base(12).plus(F.stat("attack").minus(58).times(0.20).clamp(-3, 26))
                .plus(F.level().minus(28).times(0.20).clamp(-2, 6)).clamp(9, 40).round(0),
            "拳风数", {
                unit: "道",
                description: "出拳带起的拳风数量；物攻与等级越高越密，直接驱动画面的发射量。"
            }),
        /** 起手：5 刻 − 速度偏移[−1,2] + 硬扛 2 刻；夹 4..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(58).times(0.018).clamp(-1, 2))
                .plus(F.when(F.pref("endure", text("worldcombat.skill.revenge.preference.endure")), F.const(2), F.const(0))).clamp(4, 9).round(0),
            "起手", "站定、握拳到递出之间的时间；速度快的个体起得更快，硬扛式先站稳。"),
        /** 收招：8 刻；夹 5..13。 */
        settle: seconds(F.base(8).clamp(5, 13).round(0), "收招", "一拳打完后收住的时间。"),
        /** 冷却：30 − 速度偏移[−4,6] + 硬扛 6；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(58).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("endure", text("worldcombat.skill.revenge.preference.endure")), F.const(6), F.const(0))).clamp(20, 44).round(0),
            "冷却", "这一记回拳之后多久能再还一次；速度快的个体回得更快，硬扛式更费。")
    });

    defineDamage(revengeId, "retort", {}, { contact: true });

    stages(revengeId, [
        { level: 30, values: { retort: 72 } },
        { level: 47, values: { retort: 84, push: 0.9 } }
    ]);

    describe(revengeId, [
        { key: "description.0", values: ["retort", "window"] },
        { key: "description.1", values: ["reach", "step", "radius", "push", "smash"] },
        { key: "endure.on", values: [], when: function (context) { return read(context.detail.values, ["endure"]) === true; } },
        { key: "endure.off", values: [], when: function (context) { return read(context.detail.values, ["endure"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.retort"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.retort", "tier.1.push"] }
    ]);
}
