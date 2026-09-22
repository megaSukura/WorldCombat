/**
 * 热带踢 / tropkick 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；它是本组出手最快的一脚，贴身就该用。
 * 对谁出手：单个敌人；`ai.finish`（默认开）打开时残血目标排前，用最快的一脚收掉。
 * 够不到怎么办：reach 就是本招实际射程（踢进距离 + 余量）；够不到交给共享接近逻辑，先垫步进去。
 * 放完之后：被踢退或挑飞的、并被压低攻击的目标交回共享交战计划。
 */
namespace PokemonSkills {
    function tropkickWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("tropkick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return tropkickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !tropkickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 26 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences("tropkick", {}, [
        field(pathOf("launch"), "挑飞式", "boolean", {
            help: "开启：踢中把目标朝上挑起（打断贴身、逼它重新落地）、顶得更开、焦痕更大；代价是威力 ×0.85、冷却 +4 刻。关闭（踏地式）：威力 ×1.12，踢得低平更重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "目标进入这个距离内才主动起脚；越大越早踢，也越可能在垫步到位前扑空。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用最快的一脚收掉；关闭则只按普通近战排序。"
        })
    ]);
}
