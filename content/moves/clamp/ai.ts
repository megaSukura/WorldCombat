/**
 * 贝壳夹击 / clamp 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记贴身擒抱。`available` 要求目标可见、敌对、存活、在 `ai.maxChase`（默认 6）以内，
 * 且还没有被夹住（`partiallytrapped`）；自己也必须还有 `ai.minSelf`（默认 0.35）以上的生命——壳合上后
 * 双方都动不了，血太少时把自己钉在别人刀下不划算。
 * 对谁出手：越满血、越难缠的目标越值得先夹住；焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑走到 `holdRange` 以内；走到射程内就合壳。
 * 放完之后：目标被钉住，施法者也按同一时长被钉住，随后交回共享顺序。
 */
namespace PokemonSkills {
    function clampWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(item, "minSelf", 0.35)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse("clamp", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return clampWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !clampWants(context, capability, target)) return 0;
            let base = 16 + Math.round(CompanionBehavior.ratio(target) * 40);
            if (context.facts.focus === target.ref) base += 20;
            base += Math.round((1 - CompanionBehavior.ratio(CompanionBehavior.source(context))) * 20);
            return base;
        }
    });

    addPreferences("clamp", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 1, max: 12, step: 1,
            help: "威胁离自己这么远以内才考虑合壳；调小只在贴身时出手，调大愿意先绕着对方走近再夹。"
        }),
        field(pathOf("ai.minSelf"), "自身生命下限", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命比例低于此值就不主动合壳（把自己钉在别人刀下不划算）；调到 0 表示残血也照夹。"
        })
    ]);
}
