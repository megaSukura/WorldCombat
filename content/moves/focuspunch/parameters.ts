/**
 * 真气拳 / focuspunch —— 参数、数值来源与「架势被打破」的记账。
 *
 * 原生事实：Fighting／物理／威力 150／命中 100／PP 20／优先度 −3／接触、拳招；
 * 「集中精神出拳。在招式使出前若受到攻击则会失败」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有回合，本招把「使出来之前被打到就失败」翻成一记**长而不可畏缩的收势**：
 *   提交前站定聚气（`gather` 刻），这段时间里任何外来伤害都会打断这次聚气（世界事件
 *   `world_combat:damage_applied` 命中施法者时按实例 `world.interrupt` 取消，账本清空，这一拳落空）；
 *   像畏缩那样投递的 `world_combat:interrupt` 反而不算——真气拳的收势正是为了扛住畏缩（`interruptible: false`）。
 *   聚完气之后的这一拳不再收力：沿方向短促踏进，撞上首个敌人即结算 `punch`，把它顶开。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   punch           拳力 = 基础 150 + 物攻偏移 + 等级偏移；沉势 ×1.12；夹 96..230。
 *   gather          聚气时长 = 基础 34 刻 − 速度偏移；沉势 ×1.35；夹 22..52。越长越重、越容易被打破。
 *   reach           拳程 = 2.8 格 + 物攻偏移 + 身高偏移；夹 2.6..4.4；也是实际射程来源。
 *   lunge           踏进每刻位移随速度；撞上即止。
 *   collisionRadius 判定半径随体型高度。
 *   push            击退随物攻。
 *   brace           聚气粒子速率 = 12 + 物攻偏移 + 等级偏移；驱动表现。
 *   grit／settle／recharge 起手收招冷却随速度与等级；沉势更慢更费。
 *
 * 配置 `steady`（沉势以待）在「聚得更久、打得更重」和「收得快、出得快」之间取舍：开启聚气 ×1.35、
 *   拳力 ×1.12，代价是起手更长（更像被打断）、收招 +3 刻、冷却 +8 刻；两向各有局面。
 */
namespace PokemonSkills {
    export const focuspunchId = "focuspunch";
    export const focuspunchScene = "world_combat:move_focuspunch";
    export const focuspunchBraceText = "world_combat.move.focuspunch.text.brace";
    export const focuspunchHitText = "world_combat.move.focuspunch.text.hit";
    export const focuspunchBrokenText = "world_combat.move.focuspunch.text.broken";
    export const focuspunchWhiffText = "world_combat.move.focuspunch.text.whiff";

    /** 一次聚气的实例与开始时刻；按施法者保存，命中施法者的外来伤害按它打断。 */
    export interface FocuspunchGather { instance: number; tick: number; }
    export var focuspunchGathers: { [ref: string]: FocuspunchGather } = Object.create(null);

    export function focuspunchGatherStart(actor: CombatActor, instance: number, tick: number): void {
        focuspunchGathers[String(actor.ref())] = { instance: instance, tick: tick };
    }
    export function focuspunchGatherEnd(actor: CombatActor): void { delete focuspunchGathers[String(actor.ref())]; }
    export function focuspunchGathering(actor: CombatActor): FocuspunchGather | null {
        return focuspunchGathers[String(actor.ref())] || null;
    }

    actionParameters.define(focuspunchId, {
        /** 拳力：150 +（物攻 − 60）× 0.45 [−24,54] +（等级 − 40）× 1.2 [−12,30]；沉势 ×1.12；夹 96..230。 */
        punch: formula(
            F.base(150)
                .plus(F.stat("attack").minus(60).times(0.45).clamp(-24, 54))
                .plus(F.level().minus(40).times(1.2).clamp(-12, 30))
                .times(F.when(F.pref("steady"), F.const(1.12), F.const(1)))
                .clamp(96, 230).round(1),
            "拳力", {
                unit: "威力",
                description: "聚满气之后那一拳的威力；物攻与等级越高越重，沉势式再多一成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 聚气时长：34 −（速度 − 55）× 0.15 [−4,8]；沉势 ×1.35；夹 22..52 刻。 */
        gather: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.15).clamp(-4, 8))
                .times(F.when(F.pref("steady"), F.const(1.35), F.const(1)))
                .clamp(22, 52).round(0),
            "聚气时长", "站定把气聚到拳上要多久；这段时间里挨到任何外来伤害，这一拳就散了。腿慢的个体聚得久、也更重；沉势式再拉长。"),
        /** 拳程：2.8 +（物攻 − 60）× 0.006 [−0.3,0.8] +（身高 − 1.4）× 0.25 [−0.1,0.4]；夹 2.6..4.4。 */
        reach: formula(
            F.base(2.8).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.3, 0.8))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.4)).clamp(2.6, 4.4).round(2),
            "拳程", { unit: "格", description: "踏进到拳头够到的最大距离，也是本招的实际射程来源；物攻高、臂展大的个体够得更远。" }),
        /** 踏进速度：0.8 +（速度 − 55）× 0.004 [−0.1,0.35]；夹 0.6..1.3。 */
        lunge: formula(
            F.base(0.8).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.35)).clamp(0.6, 1.3).round(2),
            "踏进速度", { unit: "格/刻", description: "聚完气后向前踏进每刻移动的距离；快的个体一步就到位。" }),
        /** 判定半径：0.5 +（身高 − 1.4）× 0.12 [−0.08,0.3]；夹 0.42..0.85。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.42, 0.85).round(2),
            "判定半径", { unit: "格", description: "拳头能咬住多大一圈；身板大的个体出手更宽。" }),
        /** 击退：0.4 +（物攻 − 60）× 0.006 [−0.1,0.5]；夹 0.25..0.95。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.5)).clamp(0.25, 0.95).round(2),
            "击退", { unit: "格", description: "命中后把目标顶开的距离；物攻越高推得越远。" }),
        /** 聚气速率：12 +（物攻 − 60）× 0.2 [−4,26] +（等级 − 40）× 0.3 [−3,9]；夹 10..48。 */
        brace: formula(
            F.base(12).plus(F.stat("attack").minus(60).times(0.2).clamp(-4, 26))
                .plus(F.level().minus(40).times(0.3).clamp(-3, 9)).clamp(10, 48).round(0),
            "聚气速率", { unit: "点", description: "聚气时收拢到拳上的光点数量；物攻与等级越高收得越密，粒子直接按它发射。" }),
        /** 收招：12 + 沉势 3；夹 9..20。 */
        settle: seconds(
            F.base(12).plus(F.when(F.pref("steady"), F.const(3), F.const(0))).clamp(9, 20).round(0),
            "收招", "打完这一拳收住的时间；沉势式收得更久。"),
        /** 冷却：46 −（速度 − 55）× 0.2 [−6,10] + 沉势 8；夹 32..72。 */
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(55).times(0.2).clamp(-6, 10))
                .plus(F.when(F.pref("steady"), F.const(8), F.const(0))).clamp(32, 72).round(0),
            "冷却", "这一拳之后多久能再聚一次气；速度快的个体回得更快，沉势式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(focuspunchId, "punch", {}, { contact: true, punch: true });

    stages(focuspunchId, [
        { level: 45, values: { punch: 172 } },
        { level: 60, values: { punch: 196, reach: 3.6 } }
    ]);

    describe(focuspunchId, [
        { key: "description.0", values: ["punch", "gather"] },
        { key: "description.1", values: ["reach", "lunge", "collisionRadius", "push"] },
        { key: "steady.on", values: [], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "timing", values: ["range", "gather", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.punch"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.punch", "tier.1.reach"] }
    ]);

    // 聚气期间命中施法者的外来伤害打破这一拳：按实例中断，不花 PP、不进冷却，只留一声「真气散了」。
    WorldCombat.on("world_combat:focuspunch/break", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var world = event.world(), victim = event.target();
        if (victim === null || !world.valid(victim)) return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        var record = focuspunchGathering(victim);
        if (record === null) return;
        if (world.tick() - record.tick > 240) { focuspunchGatherEnd(victim); return; }
        var body = world.observe(victim);
        var ended = world.interrupt(victim, record.instance, "focus-broken");
        focuspunchGatherEnd(victim);
        if (!ended || body === null) return;
        WorldFeedback.emit(world, focuspunchScene, 1, body.position(), { moment: "broken", target: String(victim.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), focuspunchBrokenText, [], 26);
    });
}
