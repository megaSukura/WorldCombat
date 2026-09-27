/**
 * 翅膀攻击 / wingattack 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格之内；更远交给共享接近逻辑。
 *   这是近身接触的一记，偏好贴脸。
 * 对谁出手：`ai.crowd`（默认关）打开时，**身前扇面内真正可达**的敌人越多排得越前（宽扫式能一次扫开一小片）；
 *   侧后、背后挤着的敌人不在扇面里，不给这一招抬分；关闭时所有目标同价，只看距离。
 * 够不到怎么办：reach 就是本招射程，不够先走近。目标若在扇面张开后走出扇边就会漏掉，这是设计的一部分。
 * 放完之后：一拍即收，交回共享交战计划等很短的冷却。
 */
namespace PokemonSkills {
    function wingattackWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 身前扇面内真正可达（在射程与张角内、且有通视线）的敌人数；侧后、隔墙的不计。 */
    function wingattackFrontCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const selfPoint = CompanionBehavior.point(self.point);
        const reach = Math.max(1.5, capability.data.range);
        const span = Math.max(30, Math.min(340, Number(p("wingattack", "span", world))));
        const heading = WorldGeometry.flatUnit(CompanionBehavior.point(target.point).minus(selfPoint));
        const cosHalf = Math.cos(span * Math.PI / 360);
        let count = 0;
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            const delta = CompanionBehavior.point(other.point).minus(selfPoint);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const length = flat.length();
            if (length < 1e-6 || length > reach) continue;
            if (WorldGeometry.dot(flat.unit(), heading) < cosHalf) continue;
            if (!world.clear(selfPoint, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("wingattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return wingattackWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !wingattackWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 18;
            if (distance <= capability.data.range) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", false))
                score += Math.min(3, wingattackFrontCrowd(context, capability, target)) * 4;
            return score;
        }
    });

    addPreferences("wingattack", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不展翅，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.crowd"), "偏好扫身前人群", "boolean", {
            help: "开启：身前扇面内真正可达的敌人越多排得越前（宽扫式一次扫开一小片）；侧后与隔墙的敌人不计，关闭则所有目标同价，只看距离。"
        })
    ]);
}
