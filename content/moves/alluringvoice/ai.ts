/**
 * 魅诱之声 / alluringvoice —— 伙伴 AI 用途。
 *
 * 这招的 AI 围绕「趁对手刚变强时唱散它」：
 *   - 何时考虑：目标看得见、活着、非友方，在 `ai.maxChase` 内（或它就是焦点）。
 *   - 对谁出手：优先当前带着正面能力等级、且还没被混乱缠上的目标——这一击会被惑乱；已经混乱的不重复唱，
 *     按普通特殊攻击排序。
 *   - 出手前：由共用任务走到 reach；声场朝目标方向张开，尽量把目标框进张角里。
 *   - 放完之后：被惑乱的目标出手可能作废、打中还会自伤，交回共享交战计划。
 *   - 什么时候紧急：目标正面等级合计达到 `ai.minStages` 时 priority 抬到 78 以上，抢在它把强化用出来之前唱散。
 */
namespace CompanionBehavior {
    /** 只读探针：目标当前正面能力等级合计，回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_alluringvoice/stages", function (access, actor) {
        return PokemonSkills.alluringVoiceBoost(access, actor);
    });

    function alluringVoiceStages(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_alluringvoice/stages", target);
        return typeof value === "number" ? value : 0;
    }

    const alluringVoiceChase = PokemonSkills.number("ai.maxChase", "开唱距离", 3, 24, 1);
    alluringVoiceChase.help = "伙伴在威胁离自己这么远以内时才考虑唱这首歌；调大愿意从更远处先声夺人。";
    const alluringVoiceMin = PokemonSkills.number("ai.minStages", "惩罚门槛", 1, 6, 1);
    alluringVoiceMin.help = "目标的正面等级合计达到这么多时才把这首歌抬到高于普通交战；调 1 见一丝强化就唱，调大只在它攒大了才优先。";
    const alluringVoiceLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    alluringVoiceLeave.help = "开启后，驻守中的伙伴会离开原位唱出这条声场。";

    PokemonSkills.addPreferences(PokemonSkills.alluringvoiceId, { ai: { maxChase: 13, minStages: 1, leaveStation: false } },
        [alluringVoiceChase, alluringVoiceMin, alluringVoiceLeave]);

    registerUse(PokemonSkills.alluringvoiceId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            if (target.friendly || !target.visible || target.health <= 0) return false;
            return context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 13);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.visible && target.health > 0
                && (context.facts.focus === target.ref || distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 13));
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            const stages = alluringVoiceStages(context, target);
            if (stages < ai<number>(item, "minStages", 1)) return 12;
            if (status(context, target, "confusion")) return 16;
            return Math.min(96, 78 + stages * 4);
        }
    });
}
