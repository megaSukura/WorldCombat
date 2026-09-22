/**
 * 猛扑 / lunge 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 7）格内；够不到交给共享接近逻辑。
 *   它是一记向前的接触跳扑，要先把身位收进去再出手。
 * 对谁出手：单个敌人；`ai.finish`（默认开）打开时残血目标排前，优先用这记重撞收掉。
 * 够不到怎么办：reach 就是本招实际射程（扑进距离）；先走近，走不到就不扑。
 * 放完之后：被顶开并被压低攻击的目标交回共享交战计划；扑空只是白走一段，不留代价。
 */
namespace PokemonSkills {
    function lungeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    CompanionBehavior.registerUse("lunge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return lungeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !lungeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 24 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            return score;
        }
    });

    addPreferences("lunge", {}, [
        field(pathOf("heavy"), "全力式", "boolean", {
            help: "开启：威力 ×1.18、顶开 ×1.35、扑进 ×1.12，一记更重更远；代价是起手 +3、收招 +3、冷却 +8 刻。关闭（轻快式）：威力 ×0.92、出手与冷却更快，适合追灵活的目标。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标进入这个距离内才主动扑上去；越大越早起跳，也越容易扑空后落在别人面前。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，优先用这记重撞收掉；关闭则只按普通近战排序。"
        })
    ]);
}
