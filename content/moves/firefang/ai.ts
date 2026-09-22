/**
 * 火焰牙 / firefang 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.seekUnlit`（默认开）打开时，还没烧起来的目标排得更前；
 *   对方是火属性（本该免疫灼伤）时再抬一档——这一口正是用来烧穿它们的。
 * 够不到怎么办：牙很短，reach 之内才动手，不够先贴近。
 * 放完之后：让灼伤持续结算，畏缩窗口交给共享交战计划处理。
 */
namespace PokemonSkills {
    function firefangWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }
    function firefangResists(target: CompanionBehavior.Entity): boolean {
        const facts: any = (<any>target).facts;
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("fire") >= 0;
    }

    CompanionBehavior.registerUse("firefang", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firefangWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firefangWants(context, capability, target)) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnlit", true) && !CompanionBehavior.status(context, target, "burn")) score += 10;
            if (firefangResists(target)) score += 8;
            return score;
        }
    });

    addPreferences("firefang", {}, [
        field(pathOf("sear"), "焦焰式", "boolean", {
            help: "开启：灼伤几率 +12%%、灼伤时长 ×1.2、穿甲窗口 +15 刻，但咬合威力 ×0.90、起手 +2 刻、冷却 +4 刻——专为烧穿火属性而来。关闭（快咬式）：咬得更重、循环更快，但火种更难点着。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。火焰牙射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.seekUnlit"), "优先点没着火的", "boolean", {
            help: "开启：还没被点着的目标排得更前，避免在有火的目标身上浪费咬穿；关闭则所有目标同价。"
        })
    ]);
}
