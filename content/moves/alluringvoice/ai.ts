/** alluringvoice：行为、参数与目标条件以本单元实现为准。 */
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
            const self = source(context);
            const stages = alluringVoiceStages(context, target);
            // 正在追击自己／主人的目标会被短音黏住，尾音落下时多半还在锥内，优先开口；高速侧移的目标降权。
            const pursuing = target.attacking === self.ref;
            const sidestep = typeof target.speed === "number" && target.speed > 0.32 ? -22 : 0;
            if (stages >= ai<number>(item, "minStages", 1)) return Math.max(4, Math.min(96, 78 + stages * 4 + (pursuing ? 8 : 0) + sidestep));
            if (pursuing) return Math.max(4, 70 + sidestep);
            if (status(context, target, "confusion")) return 16;
            return 12;
        }
    });
}
