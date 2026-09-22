/**
 * 聚光灯 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有看得见的威胁、距离在 ai.maxChase 以内、目标身上还没有同一束光，
 *   并且身边至少有 ai.focus 个友方（含自己）凑在目标附近——聚光是为了让一片人一起打它。
 * 对谁出手：当前威胁；够不到先交给共享接近逻辑。
 * 候选之间怎么排：身边友方越多、目标生命越高，越值得先照；否则只当普通控制用。
 * 放完之后：目标继续被照亮并承受更重的伤害，施法者交回共享顺序继续战斗；照明还在时不重复照。
 * 配置：mode 切换穿刺／钉住；ai.maxChase、ai.focus、ai.leaveStation 决定射程、要不要凑够同伴、驻守时是否离位。
 */
namespace CompanionBehavior {
    const spotlightChase = PokemonSkills.number("ai.maxChase", "照射距离", 4, 24, 1);
    spotlightChase.help = "威胁进入这个距离内才考虑照射；调小只在近处打光，调大愿意从更远处先标出目标。";
    const spotlightFocus = PokemonSkills.number("ai.focus", "集火人数", 1, 4, 1);
    spotlightFocus.help = "目标附近至少凑齐这么多友方（含自己）才优先聚光；调 1 表示看得见就照，调大只在真能集火时才用。";
    const spotlightLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    spotlightLeave.help = "开启后，收到驻守命令时也会为聚光离开原位。";

    function spotlightAllies(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && CompanionBehavior.distance(other.point, target.point) <= 8) count++;
        }
        return count;
    }

    PokemonSkills.addPreferences("spotlight", { mode: 0, ai: { maxChase: 14, focus: 1, leaveStation: false } },
        [spotlightChase, spotlightFocus, spotlightLeave]);

    registerUse("spotlight", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(capability, "leaveStation", false)) return false;
            if (!target) return true;
            const self = source(context);
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (status(context, target, "spotlight")) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 14)) return false;
            return spotlightAllies(context, target) >= ai<number>(capability, "focus", 1);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "spotlight");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const crowd = spotlightAllies(context, target);
            if (crowd >= ai<number>(capability, "focus", 1) + 1) return 45;
            return target.maximum > 0 && target.health / target.maximum > 0.6 ? 35 : 25;
        }
    });

    /** 被照亮的目标进入共享威胁排序，脚本化伙伴/野生 AI 也会优先扑向这束光。 */
    targetPriority("spotlight-draw", function (candidate) {
        if (status(candidate.context, candidate.subject, "spotlight")) { candidate.qualifies = true; candidate.score -= 55; }
    });
}
