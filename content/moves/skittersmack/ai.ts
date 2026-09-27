/**
 * 爬击 / skittersmack 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格之内；它是贴身招，超出交给共享接近逻辑。
 * 对谁出手：当前威胁；目标是真正的法系威胁（特攻高）时最值——这一记削的正是特攻。正在攻击别人（或主人）时最值，
 *   因为对方背对自己，这一记更容易从背后落下；目标身边太挤、没有绕到侧后的空间时降权。特攻已经触底的目标降权，
 *   别把这一记浪费在削不动的人身上。
 * 够不到怎么办：`reach` 就是出手距离，共享任务先把身位收进射程。
 * 放完之后：目标掉特攻，伙伴交回共享顺序继续交战；本招是一次绕背突击，不负责收尾。
 *
 * 手动输入不受这些推荐限制：`kind: "aim"` 允许玩家自由选目标或落点。
 */
namespace PokemonSkills {
    function skittersmackWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    /** 目标身边还挤着几个别的活体；越挤越难绕到侧后。 */
    function skittersmackCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        const reach = (target.width || 0.9) / 2 + 0.9;
        let crowd = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= reach + (other.width || 0.9) / 2) crowd++;
        }
        return crowd;
    }

    CompanionBehavior.registerUse(skittersmackId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skittersmackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !skittersmackWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context), owner = context.facts.owner;
            let base = 24;
            if (target.attacking && target.attacking !== self.ref) base += 10;
            if (owner && target.attacking === owner.ref) base += 6;
            // 特攻威胁：目标特攻越高，削它越值。
            const stats = CompanionBehavior.combatStats(context, target);
            const spa = stats && stats.stats && typeof stats.stats.spa === "number" ? stats.stats.spa : null;
            if (spa !== null && spa > 0) base += Math.min(10, spa / 8);
            // 特攻已经触底：这一记削不动了。
            if (CompanionBehavior.stage(context, target, "spa") <= -6) base -= 12;
            // 可绕行空间：目标身边太挤就降权。
            base -= Math.min(10, skittersmackCrowd(context, target) * 3);
            return Math.max(0, base);
        }
    });

    addPreferences(skittersmackId, { ai: { maxChase: 6 } }, [
        number("ai.maxChase", "出手距离", 2, 12, 1)
    ]);
}
