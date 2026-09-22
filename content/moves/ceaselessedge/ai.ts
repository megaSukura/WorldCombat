/**
 * 秘剑・千重涛 / ceaselessedge —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 近身位上；带千重涛的伙伴把它当贴身斩击，并会在同一片地上反复斩。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 6）以内、且中间有通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferCluster`（默认开）打开时，目标身边还挤着别人就抬价——碎片圈能一次割到好几个；
 *   关闭则只在需要接近时按普通近身攻击排序。
 * 够不到怎么办：3.2 格左右的短射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完之后：落点留下贝壳碎片圈，伙伴交回共享顺序；只要还在近身，它会不断斩同一目标来养锋利度。
 * 优先级：基础 22（已在射程内）／4（还要先走近）；扎堆 +12；已带着本招留下碎片的目标略高（连涛式更明显）。
 */
namespace PokemonSkills {
    /** 目标身边 3 格内还挤着几个敌人，用来读「扎堆」；只是候选排序的读法，不改变命中判定。 */
    function ceaselessedgeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || String(other.ref) === String(target.ref)) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(ceaselessedgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return 0;
            let value = gap <= capability.data.range ? 22 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferCluster", true) && ceaselessedgeCluster(context, target) >= 1) value += 12;
            return value;
        }
    });

    addPreferences(ceaselessedgeId, {}, [
        field(pathOf("relentless"), "连涛", "boolean", {
            help: "开启：冷却 ×0.55、碎片更耐放、圈更大，代价是斩击 ×0.82、每层割伤 ×0.9——适合反复斩同一片地把它养成刀阵。关闭：沉涛式，斩击 ×1.12、每层割伤 ×1.12，冷却正常、碎片圈更小更短。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动斩击，先走近；越大越愿意主动扑上去斩。"
        }),
        field(pathOf("ai.preferCluster"), "优先扎堆", "boolean", {
            help: "开启后，目标身边还挤着别人时优先斩它，在它脚下留下的碎片圈能一次割到好几个；关闭则只按普通近身攻击排序。"
        })
    ]);
}
