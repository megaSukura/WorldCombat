/**
 * 攀岩 / rockclimb —— AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活、**没有明确浮空**，且在 `ai.maxChase`（默认 11）格内；更远交给共享接近逻辑。
 *   它对空中目标会扑空，所以 `accepts` 直接拒绝明确浮空（`grounded===false`）的目标。
 * 对谁出手：`ai.finish`（默认开）残血目标排前收尾；`ai.crowd`（默认关）打开时，目标身边还挤着别人排前——
 *   落地范围能一次撞到两三个。已经带着共享混乱身份的目标排后。
 * 够不到怎么办：本招冲程短、冷却最长，reach 之内才动手，不够先贴近。
 * 放完之后：交回共享交战计划；混乱的目标出手会打散，被打散时还会踉跄半步。
 */
namespace PokemonSkills {
    function rockclimbWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
    }

    function rockclimbCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let crowd = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) crowd++;
        }
        return crowd;
    }

    CompanionBehavior.registerUse(rockclimbId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockclimbWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        priority: function (context, capability, target) {
            if (!target || !rockclimbWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 10);
            if (CompanionBehavior.ai<boolean>(capability, "crowd", false)) score += Math.min(14, rockclimbCrowd(context, target, 1.8) * 7);
            if (target.grounded === true) score += 3;
            if (CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences(rockclimbId, { ai: { maxChase: 11, finish: true, crowd: false } }, [
        field(pathOf("vault"), "跃攀", "boolean", {
            help: "开启：扑得更远更高、落地范围 ×1.35、土痕更大，但起手/收招/冷却更长、命中偏角更大（更容易扑空）。关闭（贴地扑）：低平快的一扑、偏角小更稳，代价是范围与冲程更小。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动扑，先走近；冲程短，设大也常常够不到。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这记重扑收尾；关闭则所有目标同价。"
        }),
        field(pathOf("ai.crowd"), "优先砸扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时排前，落地范围能一次撞到多人；关闭则只按普通近战排序。"
        })
    ]);
}
