/**
 * 十字剪 / xscissor 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 它对中轴目标结算两次，所以「把谁框在两刃之间」比「旁边有几个人」更重要：
 *   `ai.crowd`（默认关）在身前挤着两个以上敌人时抬优先级，把这一记当裁剪一列；关掉时始终优先剪当前威胁。
 * 放完之后：中轴目标吃了两刃、旁人被蹭到，交回共享顺序决定是继续贴身还是走位。
 */
namespace PokemonSkills {
    function xscissorCrowd(item: WorldBehavior.Capability, context: WorldBehavior.Context, self: CompanionBehavior.Entity): number {
        const reach = item.data.range, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= reach) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(xscissorId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", false)) return 24;
            const crowd = xscissorCrowd(capability, context, self);
            return crowd >= 2 ? 24 + Math.min(16, crowd * 5) : 18;
        }
    });

    addPreferences(xscissorId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.crowd", "裁剪一列")
    ]);
}
