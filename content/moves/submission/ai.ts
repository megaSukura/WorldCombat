/**
 * 地狱翻滚 / submission 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内（这招射程很短，通常先交给共享接近逻辑贴上去）。
 * 它是一记反噬不轻、换控制的招，所以伙伴只在自身生命高于 `ai.minHealth` 时才主动用；已经倒地（pinned）的目标
 * 不再优先重复摔。目标越沉越摔不动，这由公式承担，AI 只在块头明显比自己大时降低优先级。
 * 压制式适合配合队友留人，抛摔式留给换血，由玩家配置承担。
 */
namespace PokemonSkills {
    function submissionMass(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        if (typeof target.width !== "number" || typeof target.height !== "number") return 0;
        return target.width * target.height;
    }

    CompanionBehavior.registerUse("submission", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 6)) return false;
            return CompanionBehavior.ratio(CompanionBehavior.source(context))
                >= CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.status(context, target, "pinned")) return 0;
            let score = 20;
            const heavy = submissionMass(context, target), mine = submissionMass(context, self);
            if (mine > 0 && heavy > mine * 1.8) score -= 12;
            if (CompanionBehavior.status(context, target, "paralysis")
                || CompanionBehavior.status(context, target, "sleep")) score += 10;
            return score;
        }
    });

    addPreferences("submission", {}, [
        field(pathOf("pin"), "压制式", "boolean", {
            help: "开启：摔得更轻、反噬更小，但把对方按住更久，适合控场与配合队友；关闭：抛摔式，摔得更重、甩得更开、反噬更大，但对方很快爬起来。"
        }),
        field(pathOf("ai.maxChase"), "扑抓距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑抓，先走近。越大越早发起，也越容易在扑空后被反打。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动抓摔（这一摔会反噬自己）。越高越珍惜自己，也越少主动开团。"
        })
    ]);
}
