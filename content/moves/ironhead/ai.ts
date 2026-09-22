/**
 * 铁头 / ironhead 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内。
 * 它是贴身解围招：`ai.spacing`（默认「贴身推开」）让伙伴只在对手已经贴到约 2.2 格内时才用这一下，
 * 把人轰开；选「随时」就把它当普通重击，够得到就砸。贴得越近越优先——被围住时它最先被选中。
 */
namespace PokemonSkills {
    function ironheadWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        if (distance > CompanionBehavior.ai<number>(item, "maxChase", 6)) return false;
        return CompanionBehavior.ai<string>(item, "spacing", "close") !== "close" || distance <= 2.2;
    }

    CompanionBehavior.registerUse("ironhead", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return ironheadWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !ironheadWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            return distance <= 2.2 ? 40 : 24;
        }
    });

    addPreferences("ironhead", {}, [
        field(pathOf("braced"), "沉铁式", "boolean", {
            help: "开启：上步更短，但更重、震得更懵、砸得更远，起手与冷却更久。关闭：疾铁式，上步更长、出手更快，单发与击退略收。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动铁头，先走近。它射程短，设大也常常够不到。"
        }),
        field(pathOf("ai.spacing"), "出手时机", "choice", {
            options: [
                { value: "close", label: "贴身推开" },
                { value: "always", label: "随时" }
            ],
            help: "贴身推开：只在对手已经贴到约 2.2 格内时才用，专把人轰开解围。随时：把它当普通重击，够得到就砸，更常主动冲上去。"
        })
    ]);
}
