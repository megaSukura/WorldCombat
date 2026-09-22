/**
 * 神速 / extremespeed 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格内。它是一记长距重击、冷却很长，
 *   所以要挑时机：优先收尾、优先追逃跑的人，而不是随手放。更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 优先次序：射程内基础 30；目标残血（≤三成五）且开启 `ai.finish` 时 +30（这一记正好收尾）；
 *   目标正在逃跑且开启 `ai.catch` 时 +12（长距冲刺追得上）；否则按普通重击候选参与排序。
 * 够不到怎么办：射程由 `burst` 决定，共享任务把身位收进冲刺距离后再冲。
 * 放完之后：交回共享交战计划；贯穿式会把自己换到目标身后，因此别在毒圈或悬崖边乱放。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(extremespeedId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 30;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) score += 30;
            if (CompanionBehavior.ai<boolean>(capability, "catch", true) && CompanionBehavior.fleeing(context, target)) score += 12;
            return score;
        }
    });

    addPreferences(extremespeedId, {}, [
        field(pathOf("overrun"), "贯穿式", "boolean", {
            help: "开启：撞上不停，从对方身上穿过去再冲一段停在它身后，可以换位或继续追，但这一下 ×0.9、收招 +3。关闭：重撞式，撞中即停、这一下最重、收招更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "对手离自己这么远以内才主动冲；本招射程最长，设大愿意从很远就发动。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成五时优先用这一记收尾；关闭：只按普通重击候选排序。"
        }),
        field(pathOf("ai.catch"), "追逃跑者", "boolean", {
            help: "开启：正在逃跑的目标排得更前，用长距冲刺追上；关闭：只按普通重击候选排序。"
        })
    ]);
}
