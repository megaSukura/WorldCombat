/**
 * 电光 / spark 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 7）格内。射程很短，够不到先贴近。
 * 对谁出手：它没有反伤、循环最短，是缠斗里最省的一手——`ai.finish`（默认开）时，生命低于三成五的目标
 * 排最前（这一下有收尾加成），其次是还没麻痹的目标（把麻痹铺开）。
 * 放完之后：接着按共享交战计划追击或换目标，高频重复。
 */
namespace PokemonSkills {
    function sparkValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("spark", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!sparkValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) { return sparkValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) score += 22;
            if (!CompanionBehavior.status(context, target, "paralysis")) score += 12;
            return score;
        }
    });

    addPreferences("spark", {}, [
        field(pathOf("overcharge"), "蓄电式", "boolean", {
            help: "开启：威力与麻痹概率更高、麻得更久，但起手更慢、冷却更长——一次把目标钉住。关闭（点射式）：出手与循环更快、射程略长，但威力与麻痹略低——用频率压制。"
        }),
        field(pathOf("ai.maxChase"), "贴脸距离", "number", {
            min: 1, max: 12, step: 1,
            help: "超过这个距离就不主动扑上去，先靠近。电光射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.finish"), "优先收尾残血目标", "boolean", {
            help: "开启：生命低于三成五的目标排最前，这一下有收尾加成；关闭则只按普通近战排序。"
        })
    ]);
}
