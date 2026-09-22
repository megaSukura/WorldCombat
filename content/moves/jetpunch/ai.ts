/**
 * 喷射拳 / jetpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内。它是瞬发的先手重拳，
 *   愿意贴近后一口气打出去；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.douse`（默认开）时优先挑正在燃烧/灼伤的目标——这一拳正好把火浇熄；`ai.preferDry`（默认开）时
 *   已经湿透的目标排后，先打一个干的。
 * 优先次序：射程内基础 24；燃烧目标 +12（浇熄）；已带 soaked 的目标 −8（水已经浇过）；残血且 `ai.finish` 开 +8；
 *   目标的矛头正对着自己 +6，抢在它出手前把拳塞出去。
 * 够不到怎么办：射程由 `reach` 决定，共享任务把身位收进拳程后再出拳。
 * 放完之后：目标被浇透、被顶退；交回共享交战计划，水锤式把目标推离原位、打断站位。
 */
namespace PokemonSkills {
    function jetpunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse(jetpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return jetpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !jetpunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 24;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "douse", true) && CompanionBehavior.status(context, target, "burn")) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (target.attacking === self.ref) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences(jetpunchId, {}, [
        field(pathOf("hammer"), "水锤式", "boolean", {
            help: "开启：水柱在接触瞬间炸开，顶开 ×1.7、判定更宽，把目标推得更远；代价是威力 ×0.9、拳程 −0.4 格、浇透更短、冷却多 6 刻。关闭（直拳式）：更长、更重、湿得更久，但顶得近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才主动出拳；本招拳程短，设大也常常要先走近。"
        }),
        field(pathOf("ai.douse"), "优先浇火", "boolean", {
            help: "开启：优先对正在燃烧或带着灼伤的目标出拳，一拳把火浇熄；关闭：只按普通先制候选排序。"
        }),
        field(pathOf("ai.preferDry"), "先打干的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的打；关闭：当普通先制候选排序。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一拳；关闭：只按普通先制候选排序。"
        })
    ]);
}
