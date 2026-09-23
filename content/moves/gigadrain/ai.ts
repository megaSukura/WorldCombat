/**
 * 终极吸取 / gigadrain 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 16）格内。它是本族最大、最远、
 * 冷却最长的一招，`priority` 因此按"这一口值不值"排序：自身血量低于 `ai.healBelow`（默认 0.75）时抬一档
 * （回血最足）；目标离自己有 `ai.openAt`（默认 6）格以上再加一档（远程先手）；目标血量过半再加一档
 * （不浪费长冷却在残血上）。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。`ai.onlyWhenHurt` 开启时只在掉血到阈值以下才出手，
 * 把长冷却留给续航；关闭时当普通远程重招排序。够不到交给共享接近逻辑，射程就是吸根距离。
 * 放完之后：几拍抽完、目标倒下或离场即收势，交回共享顺序。
 */
namespace CompanionBehavior {
    registerUse("gigadrain", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            var hurt = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.75);
            if (CompanionBehavior.ai<boolean>(capability, "onlyWhenHurt", false) && !hurt) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            var dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > capability.data.range) return 0;
            var hurt = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.75);
            if (CompanionBehavior.ai<boolean>(capability, "onlyWhenHurt", false) && !hurt) return 0;
            var score = 22;
            if (hurt) score += 14;
            if (dist >= CompanionBehavior.ai<number>(capability, "openAt", 6)) score += 8;
            if (target.maximum > 0 && target.health / target.maximum > 0.5) score += 4;
            return score;
        }
    });

    PokemonSkills.addPreferences("gigadrain", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deepPour"), "深灌式", "boolean", {
            help: "开启：两拍重抽、根更宽、抽得更凶，但更慢、冷却更长、更容易中途被打断。关闭：三拍轻抽，总回血更高、节奏更快，适合持续站场。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动引根，先走近。越大越愿意从更远处先手抽一记。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把终极吸取当续航手段优先出手；越高越早动用这记长冷却。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.openAt"), "远距先手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标至少离这么远时才为远程先手加分；调小它更愿意贴脸抽，调大它更愿意站在外面先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.onlyWhenHurt"), "只在掉血时出手", "boolean", {
            help: "开启：只有自身生命低于回血阈值才动用这一招，长冷却留给续航。关闭：把它当普通远程重招，血满时也会用来压人。"
        })
    ]);
}
