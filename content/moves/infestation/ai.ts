/**
 * 死缠烂打的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内，而且身上还没有 `partiallytrapped` 身份
 * （缠着再放是浪费）。这是一记持续伤害兼定身，适合先手拴住目标或逼它分心去清状态。
 * 对谁出手：焦点目标优先；生命越高、越难缠的目标越值得先缠上。
 * 怎么够到：共享接近把身位收到射程以内。
 * 出手前后：放完交回共享交战计划；目标已被缠住时不再重复施放。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("infestation", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            // 越满血的对手越值得先缠住；焦点目标另加一档。
            return Math.round(CompanionBehavior.ratio(target) * 40) + (context.facts.focus === target.ref ? 24 : 0);
        }
    });

    addPreferences("infestation", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 24, step: 1,
            help: "对手离自己这么远以内才考虑死缠烂打；调小只在近身甩虫，调大愿意从更远处先手缠上。"
        }),
        field(pathOf("ai.leaveStation"), "离桩追击", "boolean", {
            help: "开启：看到值得缠的目标会离开点位追上去先手放；关闭：只在射程内出手，优先守在原位。"
        })
    ]);
}
