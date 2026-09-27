/**
 * 愤怒门牙 / superfang —— 参数、数值来源与直接结算。
 *
 * 原生事实：Normal／物理／威力 0／命中 90／PP 10／接触；伤害回调为 `clampIntRange(target HP / 2, 1)`
 * ——不看攻防，直接削掉目标当前生命的一半（Cobblemon 1.8，87 位学习者）。
 *
 * 翻译：把「用锋利门牙削掉一半 HP」落成一记**测量式的精确咬合**：门牙并拢时在双方之间牵起一条量线，
 * 咬中的那一刻直接按目标当前生命结算，不走共享攻防公式。伤害由行动直接读出并交给原生受伤入口，
 * 属性免疫（一般系打不到幽灵）由本函数按属性表拦住，其余原生反应（特性、携带物、接触效果）照常发生。
 *
 * 它是「削半」的招：对满血厚目标收益最大，对残血目标只削一点点，因此是开场/破盾的招而不是收尾的招。
 *
 * 与同族分开：咬碎研磨压塌护甲、必杀门牙钳住猛甩、贝壳刃横扫削甲；只有愤怒门牙按比例削掉生命。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   damage      咬出伤害 = 目标当前生命的一半，最小 1：只看对方还剩多少，不看攻防，也不附加自身物攻／体重。
 *   reach       扑咬距离 1.9 + 速度偏移；也是实际射程来源。
 *   lunge       扑咬速度 0.70 + 速度偏移。
 *   grip        咬合判定 0.40 + 身高偏移。
 *   holdTicks   咬住不放的时长 8 刻 + 体重偏移；这段时间施法者留在原地，是这一记的承诺。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，冷却较长（削半太强）。
 */
namespace PokemonSkills {
    /**
     * 把一笔按比例算好的固定伤害交给原生受伤入口：类型免疫按属性表拦住，护甲在本函数里排除
     * （比例伤害不参与防御比拼），其余原生结算保持原样。返回是否真的造成了伤害。
     */
    export function superfangRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        return PokemonDamage.fixed(world, target, CobblemonCombat.moveTemplate("superfang"), amount,
            { contact: contact, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
    }

    actionParameters.define("superfang", {
        /** 咬出伤害：目标当前生命 × 0.5，下限 1，取整；不附加物攻／体重碎肉。 */
        damage: formula(
            F.target("actor.health", text("worldcombat.skill.superfang.value.targetHp")).times(F.const(0.5))
                .as(text("worldcombat.skill.superfang.value.half"))
                .max(1).round(0),
            "咬出伤害", {
                unit: "点",
                description: "这一口从目标身上削去的固定伤害：目标当前生命的一半（至少 1）。它不看攻击与防御比拼，只有属性免疫与原生减伤会拦住它；目标是残血时削掉的自然也少。"
            }),
        /** 扑咬距离：基础 1.9 格，速度每比 55 快 1 加 0.012（夹 −0.3..0.9）；夹 1.5..3.0。 */
        reach: formula(
            F.base(1.9).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9)).clamp(1.5, 3.0).round(2),
            "扑咬距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远。"
            }),
        /** 扑咬速度：基础 0.70 格/刻，速度每比 55 快 1 加 0.005（夹 −0.1..0.28）；夹 0.5..1.05。 */
        lunge: formula(
            F.base(0.70).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.1, 0.28)).clamp(0.5, 1.05).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；它决定这一口多快贴上目标。"
            }),
        /** 咬合判定：基础 0.40 格，碰撞箱每比 1.4 高 1 格加 0.14（夹 −0.06..0.3）；夹 0.3..0.72。 */
        grip: formula(
            F.base(0.40).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.06, 0.3)).clamp(0.3, 0.72).round(2),
            "咬合判定", {
                unit: "格",
                description: "这一口能咬住多大一圈；门牙越大的个体咬得越宽。"
            }),
        /** 咬住时长：基础 8 刻，体重每比 60 重 1 加 0.03（夹 −2..12）；夹 6..30。 */
        holdTicks: seconds(
            F.base(8).plus(F.body("weight").minus(60).times(0.03).clamp(-2, 12))
                .clamp(6, 30).round(0),
            "咬住时长", "咬中后门牙在目标身上停留、施法者留在原地的时间；这是这一口的承诺。"),
        /** 起手：基础 7 刻，速度每比 55 快 1 少 0.02（夹 −2..1.5）；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1.5))
                .clamp(4, 14).round(0),
            "起手", "门牙并拢、量住目标再咬出去的时间；速度越快越短。"),
        /** 收招：基础 8 刻，速度每比 55 快 1 少 0.015（夹 −2..1.5）；夹 3..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5))
                .clamp(3, 13).round(0),
            "收招", "松口退开的收势。"),
        /** 冷却：基础 34 刻，速度每比 55 快 1 少 0.07（夹 −5..3）；夹 20..50。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.07).clamp(-5, 3))
                .clamp(20, 50).round(0),
            "冷却", "两次削半之间的等待；它比同族的直接伤害更长，因为削半本身很强。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    stages("superfang", [
        { level: 28, values: { holdTicks: 10 } },
        { level: 46, values: { holdTicks: 12 } }
    ]);

    describe("superfang", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["reach", "lunge", "grip"] },
        { key: "description.path", values: [] },
        { key: "description.2", values: ["holdTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.1.level", "tier.1.holdTicks"] }
    ]);
}
