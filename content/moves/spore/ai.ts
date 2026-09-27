/**
 * 蘑菇孢子 的伙伴 AI 用途：这招自己的一套出手计划——先把自己送进人群，再抖开孢子。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、孢子半径内至少站着 ai.minFoes 个
 *   还醒着、且不吃粉末的非友方。半径与实际高度带都读本招自己的公式（`p`），不再自写近似值。它是四式里最
 *   可靠但也最贵的一记，所以只在能一次罩住人时才用。
 * 对谁出手：当前威胁；已经睡着的跳过。
 * 够不到怎么办：reach 就是孢子半径，够不到就由共享任务走近目标；收到「驻守」时固定原地（够到才抖、不追击）。
 * 放完之后：圈里还醒着的非友方几乎必睡；伙伴交回共享顺序，等最长的一档冷却。
 * 优先级：基础 52；圈里每多一个醒着的非友方 +8，最高 90；逃跑中的威胁再 +10。
 */
namespace PokemonSkills {
    /** 草属性穿过孢子：它不值得为它抖孢子。 */
    function sporeImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }

    /** 与出招同一棵公式的实际孢子半径（体宽、特攻、等级与浓／蓬配置），AI 不再自写近似值。 */
    function sporeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.5, Math.min(3.4, PokemonSkills.p(sporeId, "burstRadius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills.spore, detail: { values: item.data.config || {} } })));
        } catch (error) {
            return 2.2;
        }
    }

    /** 孢子半径与出招同一条实际高度带（自身中心下 2、上 3）里还醒着的非友方数量。 */
    function sporeAwakeFoes(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), radius = sporeRadius(context, item);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2], dy = other.point[1] - self.point[1];
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            if (dy < -2 || dy > 3) continue;
            if (CompanionBehavior.status(context, other, "sleep")) continue;
            if (sporeImmune(context, other)) continue;
            count++;
        }
        return count;
    }

    /** 收到「驻守」且未允许离位：可以原地抖粉，但不为追人挪窝。 */
    function sporeStation(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const holding = context.facts.intent === "hold" || context.facts.intent === "stay";
        return holding && !CompanionBehavior.ai<boolean>(item, "leaveStation", false);
    }

    function sporeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (CompanionBehavior.status(context, threat, "sleep")) return false;
        if (sporeImmune(context, threat)) return false;
        return sporeAwakeFoes(context, item) >= CompanionBehavior.ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse(sporeId, {
        protocols: ["world_combat:control"],
        reach: function (context, item) { return sporeRadius(context, item); },
        available: function (context, item, purpose, target) { return !target || sporeWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        // 驻守时固定原地（够到才抖），否则把目标当作接近点。
        approachTarget: function (context, item, target) { return sporeStation(context, item) ? CompanionBehavior.source(context) : target; },
        priority: function (context, item, target) {
            if (!target || !sporeWants(context, item, target)) return 0;
            const awake = sporeAwakeFoes(context, item);
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
