/**
 * 雪崩 / avalanche —— 参数、伤害段与「累计挨打」的记账。
 *
 * 原生事实：Ice／物理／威力 60／命中 100／PP 10／接触／优先度 −4；
 *   「如果受到对手的招式攻击，就能给予该对手 2 倍威力的攻击」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有先后手，本招把「受到对手的招式攻击」落成一条真实的**积伤**：当前配招带雪崩的个体被对手
 *   打到，就挂上共享身份 `world_combat:status/battered`（被打懵），可叠到 5 层；雪崩命中时若自己带着它，
 *   这一记翻倍，并且**层数越厚，崩下来的范围与击退越大**——被压得越久，雪堆得越沉。落点在冰面上留下
 *   一层短暂的积雪（地形租借），是这个念头在世界里留下的东西。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   collapse 雪崩威力 54 + 物攻偏移 + 等级偏移；带 battered 时 ×2，厚重式 ×0.90。
 *   reach    滚落距离 2.8 格 + 速度偏移 + 等级偏移；也是实际射程来源，慢而短。
 *   step     每刻位移 0.62 格/刻 + 速度偏移（最慢的一招）。
 *   radius   震荡半径 1.0 格 + 体型高度偏移 + 层数×0.12；厚重式 ×1.25。
 *   push     击退 0.50 格 + 物攻偏移 + 层数×0.06；厚重式 ×1.15。
 *   shards   冰屑数 16 + 物攻偏移 + 层数×2，驱动表现。
 *   frost    积雪存留 3 秒 + 等级偏移，地形租借时长。
 *   brace／settle／recharge 速度决定起手、收招、冷却。
 *
 * 配置 `deepdrift`（厚重）：开启＝震荡半径 ×1.25、击退 ×1.15、滚得更远 ×1.12，但本击 ×0.90、起手 +2、冷却 +8；
 *   关闭＝本击 ×1.06、滚得干脆。两向各有局面：铺开压制 vs 一记砸实。
 */
namespace PokemonSkills {
    export const avalancheId = "avalanche";
    export const avalancheScene = "world_combat:move_avalanche";
    export const avalancheStatus = "battered";
    export const avalancheEffect = "world_combat:avalanche_battered";
    export const avalancheCrashText = "world_combat.move.avalanche.text.crash";
    export const avalancheHitText = "world_combat.move.avalanche.text.hit";
    export const avalancheMissText = "world_combat.move.avalanche.text.miss";
    /** 积伤窗口与叠加上限（协议常量）：一次挨打的印记停留多久、最多叠几层。 */
    export const avalancheBruise = 200;
    export const avalancheMaxStacks = 5;

    /** 施法者身上积了几层「被打懵」；0 表示没挨过打。 */
    export function avalancheStacks(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const effect = CombatStatus.representative(world, actor, avalancheStatus);
        return effect === null ? 0 : Math.min(avalancheMaxStacks, effect.amplifier() + 1);
    }

    defineFacts(avalancheId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            if (id === "avalanche.battered") return CombatStatus.has(context.world, context.actor, avalancheStatus) ? 1 : 0;
            if (id === "avalanche.stacks") return avalancheStacks(context.world, context.actor);
            return undefined;
        } };
    });

    actionParameters.define(avalancheId, {
        /** 雪崩威力：54 + 物攻偏移[−14,32] + 等级偏移[−4,10]；带 battered ×2、厚重式 ×0.90 / 常规 ×1.06；夹 32..150。 */
        collapse: formula(
            F.base(54)
                .plus(F.stat("attack").minus(58).times(0.28).clamp(-14, 32))
                .plus(F.level().minus(28).times(0.35).clamp(-4, 10))
                .times(F.when(F.var("avalanche.battered", text("worldcombat.skill.avalanche.value.battered")).gt(0), F.const(2), F.const(1)))
                .times(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(0.90), F.const(1.06)))
                .clamp(32, 150).round(1),
            "雪崩威力", {
                unit: "威力",
                description: "这一记雪崩的基准威力；物攻与等级越高越重。自己带着「被打懵」积伤时翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 滚落距离：(2.8 + 速度偏移[−0.4,1.2] + 等级偏移[0,0.6]) × 厚重 1.12；夹 2.4..5.0；也是实际射程来源。 */
        reach: formula(
            F.base(2.8).plus(F.stat("speed").minus(58).times(0.012).clamp(-0.4, 1.2))
                .plus(F.level().minus(28).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(1.12), F.const(1.0)))
                .clamp(2.4, 5.0).round(2),
            "滚落距离", {
                unit: "格",
                description: "雪堆朝目标滚出去的最大距离，也是本招的实际射程来源；快的个体滚得更远。"
            }),
        /** 每刻位移：0.62 格/刻 + 速度偏移[−0.12,0.28]；夹 0.45..1.00。 */
        step: formula(
            F.base(0.62).plus(F.stat("speed").minus(58).times(0.003).clamp(-0.12, 0.28)).clamp(0.45, 1.00).round(2),
            "滚落速度", {
                unit: "格/刻",
                description: "雪堆每刻移动的距离；它本就是一记慢招，越快越能咬住目标。"
            }),
        /** 震荡半径：(1.0 + 体型高度偏移[−0.2,0.5] + 层数×0.12) × 厚重 1.25；夹 0.7..2.4。 */
        radius: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.20).clamp(-0.2, 0.5))
                .plus(F.var("avalanche.stacks", text("worldcombat.skill.avalanche.value.stacks")).times(0.12))
                .times(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(1.25), F.const(1.0)))
                .clamp(0.7, 2.4).round(2),
            "震荡半径", {
                unit: "格",
                description: "雪崩落地时波及多大一圈；身板大的个体崩得更宽，挨得越多的积伤也让这圈更大。"
            }),
        /** 击退：(0.50 + 物攻偏移[−0.1,0.5] + 层数×0.06) × 厚重 1.15；夹 0.30..1.40。 */
        push: formula(
            F.base(0.50).plus(F.stat("attack").minus(58).times(0.006).clamp(-0.1, 0.5))
                .plus(F.var("avalanche.stacks", text("worldcombat.skill.avalanche.value.stacks")).times(0.06))
                .times(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(1.15), F.const(1.0)))
                .clamp(0.30, 1.40).round(2),
            "击退", {
                unit: "格",
                description: "震荡把周围的人推开的距离；物攻越高、积伤越厚，推得越远。"
            }),
        /** 冰屑数：16 + 物攻偏移[−4,28] + 层数×2；夹 12..48。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(58).times(0.22).clamp(-4, 28))
                .plus(F.var("avalanche.stacks", text("worldcombat.skill.avalanche.value.stacks")).times(2)).clamp(12, 48).round(0),
            "冰屑数", {
                unit: "枚",
                description: "雪崩炸开的冰屑数量；物攻越高、积伤越厚越密，直接驱动画面的发射量。"
            }),
        /** 积雪存留：60 刻（3.0 秒）+ 等级偏移[0,20 刻]；夹 40..100 刻（地形租借时长）。 */
        frost: seconds(
            F.base(60).plus(F.level().minus(28).times(0.4).clamp(0, 20)).clamp(40, 100).round(0),
            "积雪存留", "落点上那层积雪在地面停留多久；等级越高留得越久。"),
        /** 起手：8 刻 − 速度偏移[−1.5,3] + 厚重 2 刻；夹 5..13。 */
        brace: seconds(
            F.base(8).minus(F.stat("speed").minus(58).times(0.02).clamp(-1.5, 3))
                .plus(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(2), F.const(0))).clamp(5, 13).round(0),
            "起手", "从拢起雪堆到滚出去之间的时间；速度快的个体起得更快，厚重式先堆实。"),
        /** 收招：9 刻；夹 5..14。 */
        settle: seconds(F.base(9).clamp(5, 14).round(0), "收招", "雪崩砸完收住的时间。"),
        /** 冷却：34 − 速度偏移[−4,6] + 厚重 8；夹 22..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(58).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("deepdrift", text("worldcombat.skill.avalanche.preference.deepdrift")), F.const(8), F.const(0))).clamp(22, 48).round(0),
            "冷却", "这一记雪崩之后多久能再滚一次；速度快的个体回得更快，厚重式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(avalancheId, "collapse", {}, { contact: true });

    stages(avalancheId, [
        { level: 32, values: { collapse: 70 } },
        { level: 50, values: { collapse: 86, radius: 1.5 } }
    ]);

    describe(avalancheId, [
        { key: "description.0", values: ["collapse"] },
        { key: "description.1", values: ["reach", "step", "radius", "push", "frost"] },
        { key: "deepdrift.on", values: [], when: function (context) { return read(context.detail.values, ["deepdrift"]) === true; } },
        { key: "deepdrift.off", values: [], when: function (context) { return read(context.detail.values, ["deepdrift"]) !== true; } },
        { key: "timing", values: ["range", "brace", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.collapse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.collapse", "tier.1.radius"] }
    ]);

    // 当前有效配招带本招时积伤；其他域由内容显式授予本单元载具后启用相同的续积累。
    WorldCombat.on("world_combat:move_avalanche/battered", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        const world = event.world(), victim = event.target();
        if (victim === null || !world.valid(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        if (String(victim.domain()) === "cobblemon" ? !NativeLoadout.hasEquipped(world, victim, avalancheId)
            : MobEffects.read(world, victim, avalancheEffect) === null) return;
        const stacks = Math.min(avalancheMaxStacks, avalancheStacks(world, victim) + 1);
        CombatStatus.apply(world, victim, avalancheStatus, avalancheEffect, avalancheBruise, stacks - 1, { unique: true });
    });
}
