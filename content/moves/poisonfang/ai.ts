/**
 * 剧毒牙 / poisonfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.deepenExisting`（默认开）打开时，已经中毒的目标排得最前——这一口能确保把它加深成剧毒；
 *   关闭时反过来优先没中毒的目标，把毒铺到更多敌人身上。
 * 够不到怎么办：牙很短，reach 之内才动手，不够先贴近。
 * 放完之后：毒在伤口里持续结算，交回共享交战计划；不需要畏缩的判定。
 */
namespace PokemonSkills {
    function poisonfangWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("poisonfang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return poisonfangWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !poisonfangWants(context, capability, target)) return 0;
            const deepen = CompanionBehavior.ai<boolean>(capability, "deepenExisting", true);
            const poisoned = CompanionBehavior.status(context, target, "poison");
            if (poisoned) return deepen ? 34 : 18;
            return deepen ? 20 : 30;
        }
    });

    addPreferences("poisonfang", {}, [
        field(pathOf("venom"), "浓毒式", "boolean", {
            help: "开启：剧毒几率 +16%%、毒液时长 ×1.25，但咬合威力 ×0.92、注毒延迟 +2 刻、冷却 +4 刻——把毒下得更重。关闭（快毒式）：咬得更重、毒渗得更快，但更难加重为剧毒。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。剧毒牙射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.deepenExisting"), "优先加深已毒目标", "boolean", {
            help: "开启：已经中毒的目标排得最前，这一口能确保把它们加深成剧毒。关闭：优先还没中毒的目标，把毒铺到更多敌人身上。"
        })
    ]);
}
