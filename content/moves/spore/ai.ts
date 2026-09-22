/**
 * 蘑菇孢子 的伙伴 AI 用途：这招自己的一套出手计划——先把自己送进人群，再抖开孢子。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、孢子半径内至少站着 ai.minFoes 个
 *   还醒着、且不吃粉末的非友方。它是四式里最可靠但也最贵的一记，所以只在能一次罩住人时才用。
 * 对谁出手：当前威胁；已经睡着的跳过。
 * 够不到怎么办：reach 就是孢子半径，够不到就由共享任务走近目标——自爆式范围招的接近就是它的准备。
 * 放完之后：圈里还醒着的非友方几乎必睡；伙伴交回共享顺序，等最长的一档冷却。
 * 优先级：基础 52；圈里每多一个醒着的非友方 +8，最高 90；逃跑中的威胁再 +10。
 */
namespace PokemonSkills {
    /** 草属性穿过孢子：它不值得为它抖孢子。 */
    function sporeImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }

    /** 与参数公式同源的孢子半径估算（AI 只用体宽与配置；实际判定仍走招式自己的公式）。 */
    function sporeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const dense = !!(item.data.config && item.data.config.dense);
        return Math.max(1.5, Math.min(3.4, (2.2 + Math.max(-0.3, Math.min(1.1, (width - 0.9) * 0.9))) * (dense ? 0.8 : 1.25)));
    }

    /** 孢子半径里还醒着的非友方数量。 */
    function sporeAwakeFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, centre) > radius) continue;
            if (CompanionBehavior.status(context, other, "sleep")) continue;
            if (sporeImmune(context, other)) continue;
            count++;
        }
        return count;
    }

    function sporeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (CompanionBehavior.status(context, threat, "sleep")) return false;
        if (sporeImmune(context, threat)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        return sporeAwakeFoes(context, self.point, sporeRadius(context, item)) >= CompanionBehavior.ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse(sporeId, {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return sporeRadius(context, item); },
        available: function (context, item, purpose, target) { return !target || sporeWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (context, item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !sporeWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const awake = sporeAwakeFoes(context, self.point, sporeRadius(context, item));
            const flee = CompanionBehavior.fleeing(context, target) ? 10 : 0;
            return Math.min(90, 52 + awake * 8) + flee;
        }
    });

    addPreferences(sporeId, { ai: { minFoes: 1, leaveStation: false } }, [
        field(pathOf("ai.minFoes"), "抖孢子人数", "number", {
            min: 1, max: 5, step: 1,
            help: "孢子半径内至少站着这么多还醒着的非友方才抖开；调 1 表示身边有人就抖，调高则等人聚齐再炸。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会为抖孢子离开原位；关闭则只在原地够得到时出手。"
        })
    ]);
}
