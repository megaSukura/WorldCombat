/**
 * 剧毒牙 / poisonfang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.deepenExisting`（默认开）打开时已中毒的目标排前，这一口能确保加深为剧毒；关闭则优先没中毒的。
 *   毒在咬后压一小拍才渗开，届时目标要留在口边，所以能保持短暂近距的目标优先；
 *   高速绕身的目标很难留在射程内，降一档、不强行追针。
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
            let score = poisoned ? (deepen ? 34 : 18) : (deepen ? 20 : 30);
            // 注毒要目标留在口边一小拍：离得近、走得慢的目标排得更前。
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range) score += 4;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.01) score -= 12;
            return score;
        }
    });

    addPreferences("poisonfang", {}, [
        field(pathOf("venom"), "浓毒式", "boolean", {
            help: "开启：剧毒几率 +16%%、毒液时长 ×1.25，但咬合威力 ×0.92、注毒延迟 +2 刻、冷却 +4 刻——把毒下得更重。关闭（快毒式）：咬得更重、毒渗得更快，但更难加重为剧毒。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动近身，先走近。剧毒牙射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.deepenExisting"), "优先加深已毒目标", "boolean", {
            help: "开启：已经中毒的目标排得最前，这一口能确保把它们加深成剧毒。关闭：优先还没中毒的目标，把毒铺到更多敌人身上。"
        })
    ]);
}
