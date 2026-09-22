/**
 * 大声咆哮 / snarl 的伙伴 AI 用途：这招自己的一套出手计划——站到能一口气喝住一小簇的位置，再按拍骂出去。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自身为顶点、朝威胁那条线推出去的锥里
 *   至少罩得住 ai.cluster 个敌人（默认 2；调 1 表示看得见就喝）。目标已经带着 snarled 身份时，
 *   ai.skipScolded（默认开）跳过，把这一轮留给还没被骂软的人。
 * 对谁出手：当前威胁；锥里罩住的人越多越优先，焦点目标另加一档。
 * 够不到怎么办：reach 就是声压锥长，由共享任务把身体带进射程；这招靠近本身就是它的准备。
 * 放完之后：被第一声喝住的人特攻下降、带上被斥身份，伙伴交回共享顺序，再决定追击还是趁对方错拍拉开。
 */
namespace CompanionBehavior {
    /** 朝威胁那条线的锥内、在射程里的非友方数量；声音不看视线。与参数公式的 zhang 角同源（约 55° 半张）。 */
    function snarlCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = source(context);
        const heading = Math.atan2(target.point[2] - self.point[2], target.point[0] - self.point[0]);
        const half = 55 * Math.PI / 180, reach = item.data.range;
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, self.point) > reach) continue;
            let diff = Math.abs(Math.atan2(other.point[2] - self.point[2], other.point[0] - self.point[0]) - heading);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff <= half) count++;
        }
        return count;
    }

    /** 射程内是否还有一个还没被骂软的非友方；有的话才把这一轮留给它。 */
    function snarlFresh(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, source(context).point) > item.data.range) continue;
            if (!status(context, other, "snarled")) return true;
        }
        return false;
    }

    function snarlWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (ai<boolean>(item, "skipScolded", true) && status(context, target, "snarled")
            && snarlFresh(context, item, target)) return false;
        if (distance(source(context).point, target.point) > ai<number>(item, "maxChase", 11)) return false;
        return snarlCaught(context, item, target) >= ai<number>(item, "cluster", 1);
    }

    registerUse("snarl", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return snarlWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !snarlWants(context, item, target)) return 0;
            let base = 20 + Math.min(3, snarlCaught(context, item, target)) * 6;
            if (context.facts.focus === target.ref) base += 16;
            return base;
        }
    });

    PokemonSkills.addPreferences("snarl", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("rant"), "骂不绝口", "boolean", {
            help: "开启（连斥式）：一声接一声喝三遍，每声约 ×0.62、间隔更密、锥更窄更远、冷却 +6 刻——把对方压在原地反复削，但对手能走出锥外躲掉后面几声。关闭（断喝式）：只喝一声，威力 ×1.4、锥更宽——一次出口更重。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 18, step: 1,
            help: "威胁在这么远以内才考虑出手；调小只在近处喝，调大愿意先走近一簇敌人再开口。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.cluster"), "簇优先人数", "number", {
            min: 1, max: 4, step: 1,
            help: "声压锥里至少罩住这么多敌人才优先出手；调 1 表示看得见就喝。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.skipScolded"), "跳过已被骂软的人", "boolean", {
            help: "开启：目标已经带着 snarled 身份时跳过，把这一轮留给还没被骂软的人；关闭：照常重复喝。"
        })
    ]);
}
