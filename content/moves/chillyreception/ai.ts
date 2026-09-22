/**
 * 冷笑话 / chillyreception 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 12）格内，自己身上还没有挂着这招留下的雪（不连发）。
 * 什么时候最想出手：生命掉到 `ai.retreatBelow`（默认 50%）以下、或身边挤着两个以上敌人时 priority 抬到 82
 *   ——正是需要开一条退路、把场子交出去的时候；其余情况 38，当作留雪与清仇恨的布置。
 * 出手前的准备：原地讲完笑话；出手后由共享 `world_combat:cover` 目标把这次登场结束。
 * 放完之后：敌人被打断、定住、松开仇恨，雪留在原地，自己退开；雪还在身上时不再重复。
 */
namespace CompanionBehavior {
    const chillyChase = PokemonSkills.number("ai.maxChase", "开讲距离", 2, 20, 1);
    chillyChase.help = "伙伴只在威胁离自己这么远以内时才考虑冷笑话；调小只在贴身时开讲，调大愿意提前清场。";
    const chillyRetreat = PokemonSkills.number("ai.retreatBelow", "退场阈值", 0.1, 0.8, 0.05);
    chillyRetreat.help = "生命低于这个比例时优先讲冷笑话脱身；调高更早退场，调低更常留场战斗。";

    PokemonSkills.addPreferences("chillyreception", { ai: { maxChase: 12, retreatBelow: 0.5, leaveStation: false } },
        [chillyChase, chillyRetreat, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function chillyCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:cover", source(context));
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "chillyreception") return items[i];
        return null;
    }
    function chillyCrowd(context: WorldBehavior.Context): number {
        const self = source(context);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return other.health > 0 && other.visible && !other.friendly && distance(other.point, self.point) <= 7;
        }).length;
    }
    function chillyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (context.facts.mounted) return false;
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        const self = source(context);
        if (status(context, self, "snow")) return false;
        return distance(self.point, threat.point) <= ai<number>(item, "maxChase", 12);
    }

    registerUse("chillyreception", {
        protocols: ["world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item, target) {
            const threat: Entity | null = target || context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context);
            if (ratio(self) < ai<number>(item, "retreatBelow", 0.5) || chillyCrowd(context) >= 2) return 82;
            return 38;
        },
        available: function (context, item, _purpose, _target) { return chillyWants(context, item, context.senses["world_combat:threat"]); },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; }
    });
}
