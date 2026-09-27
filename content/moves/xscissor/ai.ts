/**
 * 十字剪 / xscissor 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 一剪只结算一次，所以「身前夹口里能带过几个」比「旁边有几个人」更重要：
 *   `ai.crowd`（默认关）打开时，以「自身→候选目标」为朝向，数一数真正落进合拢夹口（前方、reach 内、
 *   横向不超过当前 span 撑出的半宽）的敌人；挤着两个以上就把这招抬到优先，把这一记当裁剪一列；
 *   关闭时始终优先剪当前威胁。身后一圈的敌人不计入。
 * 放完之后：夹口里的目标被剪过，交回共享顺序决定是继续贴身还是走位。
 */
namespace PokemonSkills {
    /** 身前夹口里站着的敌人数量：沿自身→候选目标的前向，落在 reach 内且横向不超过合口半宽。 */
    function xscissorJawCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
                              self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        const reach = capability.data.range;
        const span = p(xscissorId, "span", CompanionBehavior.world(context));
        const half = Math.max(0.3, reach * Math.sin(Math.max(30, Math.min(170, span)) * Math.PI / 360));
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.1) return 1;
        const ux = dx / length, uz = dz / length, rx = -uz, rz = ux;
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along < 0 || along > reach + 0.6) continue;
            if (Math.abs(ox * rx + oz * rz) > half) continue;
            count++;
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
            const jaw = xscissorJawCount(context, capability, self, target);
            return jaw >= 2 ? 24 + Math.min(16, jaw * 5) : 18;
        }
    });

    addPreferences(xscissorId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.crowd", "横剪一列")
    ]);
}
