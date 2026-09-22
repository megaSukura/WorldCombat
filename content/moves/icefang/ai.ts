/**
 * 冰冻牙 / icefang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.finishFrozen`（默认开）打开时，已经冻住的目标排得最前——这一口会咬碎冰壳多结算一段；
 *   对又冻又残的目标再抬一档。没有冻结目标时把它当普通的直冻起手。
 * 够不到怎么办：牙很短，reach 之内才动手，不够先贴近。
 * 放完之后：等寒气渗入的那一拍结算，交回共享交战计划。
 */
namespace PokemonSkills {
    function icefangWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("icefang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icefangWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icefangWants(context, capability, target)) return 0;
            const finish = CompanionBehavior.ai<boolean>(capability, "finishFrozen", true);
            const frozen = CompanionBehavior.status(context, target, "frozen");
            if (finish && frozen) return CompanionBehavior.ratio(target) < 0.4 ? 48 : 38;
            return 22;
        }
    });

    addPreferences("icefang", {}, [
        field(pathOf("deep"), "深寒式", "boolean", {
            help: "开启：冰冻几率 +12%%、冰冻时长 ×1.4、冷脆额外伤害 ×1.3，但咬合威力 ×0.90、起手 +2 刻、冷却 +4 刻——锁住并咬碎关键目标。关闭（急寒式）：咬得更重、循环更快，但冻得更短、咬碎得更轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。冰冻牙射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.finishFrozen"), "优先收冻结目标", "boolean", {
            help: "开启：已经冻住的目标排得最前，这一口能咬碎冰壳多结算一段伤害；关闭则只按普通近战排序，不再为咬碎加分。"
        })
    ]);
}
