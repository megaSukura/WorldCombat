/**
 * 淘金潮 / makeitrain 的伙伴 AI 用途。
 *
 * 什么局面有意义：一个以自身为中心、高威力但有自我特攻代价的大招。`ready` 要求身周可及范围内至少站着
 *   `ai.minFoes`（默认 2）个可见、敌对的敌人，否则整招不参与选择——一发会掏空自己的大招，只有值得时才放。
 *   面对单体 Boss，玩家可以把 `ai.minFoes` 调到 1。
 * 对谁出手：不需要选目标（绕身倾泻）；`accepts` 只筛阵营、存活与可见。
 * 什么时候最想出手：圈里人越多 priority 越高；它是清场手段，围得越紧越值。
 * 低顶密室：可用高度截得住弧顶，AI 用 `world.clear` 实测头顶空间，把覆盖半径估短后再数人，不用开阔地的高估值。
 * 够不到怎么办：reach 是实测覆盖半径，共享任务先把身位收进圈内再倾库。
 * 放完之后：交回共享交战计划；金币只落在真实终点。
 */
namespace PokemonSkills {
    /** 低顶会截短弧顶：按头顶真实可用空间估一个可用覆盖半径，避免在密室里高估。 */
    function makeitrainCoverage(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const radius = typeof item.data.range === "number" ? item.data.range : 5;
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const apex = Math.max(1.5, radius * 0.7);
        const from = CompanionBehavior.point(self.point);
        if (!world.clear(from, from.plus(WorldCombat.point(0, apex, 0)))) return radius * 0.55;
        return radius;
    }

    function makeitrainFoes(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = makeitrainCoverage(context, item);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("makeitrain", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return makeitrainCoverage(context, item); },
        ready: function (context, item) {
            return item.data.ready !== false && makeitrainFoes(context, item) >= CompanionBehavior.ai<number>(item, "minFoes", 2);
        },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, item, target) { return target; },
        priority: function (context, item, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > makeitrainCoverage(context, item)) return 0;
            return Math.min(96, 40 + Math.min(24, makeitrainFoes(context, item) * 10));
        }
    });

    addPreferences("makeitrain", {}, [
        field(pathOf("hoard"), "倾库式", "boolean", {
            help: "开启：单束 ×1.12、覆盖半径 ×1.15、金雨束数 ×1.3，但自损特攻从 1 级升到 2 级、起手 +4 刻、冷却 +30 刻；关闭：常备金库，自损 1 级、范围与束数按基础值，回气更快。"
        }),
        field(pathOf("ai.minFoes"), "最少目标数", "number", {
            min: 1, max: 6, step: 1,
            help: "身周至少站着几个敌人才用这一发；越大越只在真正扎堆时才倾库，避免为一两个目标掏空自己。面对单体 Boss 可以调到 1。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动靠近，先在覆盖圈外待命；越大越愿意先走近再倾泻。"
        })
    ]);
}
