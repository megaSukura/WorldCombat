/**
 * 水流喷射 / aquajet 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 9）格内。它比电光一闪射得更远，
 *   所以愿意在更外侧起手，把水柱一口气打过去；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。选择偏好：`ai.douse` 开启时优先挑正在燃烧/灼伤的目标
 *   （这一冲正好把火浇熄）；`ai.preferDry` 开启时已经湿透的目标排后，先浇一个干的。
 * 优先次序：射程内基础 23；燃烧目标 +14（浇熄）；已带 soaked 的目标 −8（水已经浇过）；目标残血 +8。
 * 够不到怎么办：射程由 `surge` 决定，共享任务把身位收进喷射距离后再射。
 * 放完之后：目标被浇透、被顶开，交回共享交战计划；激流式一次扫过一片，适合打散贴在一起的敌人。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aquajetId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 23;
            if (CompanionBehavior.ai<boolean>(capability, "douse", true) && CompanionBehavior.status(context, target, "burn")) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(aquajetId, {}, [
        field(pathOf("deluge"), "激流贯注", "boolean", {
            help: "开启：水柱贯穿整条路径、浇透并打伤碰到的每个人、判定更宽、湿得更久，但单点伤害 ×0.82、冷却多 6 刻。关闭：单发鱼雷，命中即停、这一下最重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才主动喷射；本招射得比电光一闪远，设大愿意更早放。"
        }),
        field(pathOf("ai.douse"), "优先浇火", "boolean", {
            help: "开启：优先对正在燃烧或带着灼伤的目标射出水柱，一冲把火浇熄；关闭：只按普通先制候选排序。"
        }),
        field(pathOf("ai.preferDry"), "先浇没湿的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的浇；关闭：当普通先制候选排序。"
        })
    ]);
}
