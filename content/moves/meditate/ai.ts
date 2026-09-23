/**
 * 瑜伽姿势 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有威胁、还在 ai.maxChase 以内时；
 *   开启 ai.calmFirst（默认）时只在最近没挨过打（hurtAgo ≥ 60 刻）才开始静心——那样能叫醒两层。
 * 什么时候最想出手：安静窗口里 priority 95，抢在普通交战前把物攻叫醒到两层；正被打且关闭 calmFirst 时降到 45 兜底叫醒一层。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。贴身（小于 minGap）时让位给普通攻击，不为强化站着挨打。
 * 放完之后：物攻抬起、「入静」标记挂上，伙伴交回共享交战计划。
 */
namespace CompanionBehavior {
    const meditateChase = PokemonSkills.number("ai.maxChase", "静心距离", 3, 24, 1);
    meditateChase.help = "威胁进入这个距离内才考虑开始瑜伽姿势；越大越早开始准备。";
    const meditateGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1);
    meditateGap.help = "威胁近于这个距离时不再静心、直接交战；调大更常在近身时放弃冥想。";
    const meditateCalm = PokemonSkills.flag("ai.calmFirst", "宁静静候");
    meditateCalm.help = "开启：只在最近没挨打时才开始冥想（多唤醒一级）；关闭：被打着也照常冥想（少一级）。";

    registerUse("meditate", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (["atk"].every(function (stat) { return CompanionBehavior.stage(context, CompanionBehavior.source(context), stat) >= 6; })) return false;
            const self = source(context);
            const calm = typeof self.hurtAgo === "number" && self.hurtAgo >= 60;
            if (ai<boolean>(capability, "calmFirst", true) && !calm) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(self.point, threat.point) < ai<number>(capability, "minGap", 2)) return false;
            return distance(self.point, threat.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context);
            if (distance(self.point, threat.point) < ai<number>(capability, "minGap", 2)) return 0;
            const calm = typeof self.hurtAgo === "number" && self.hurtAgo >= 60;
            if (calm) return 95;
            return ai<boolean>(capability, "calmFirst", true) ? 0 : 45;
        }
    });

    PokemonSkills.addPreferences("meditate", { deepBreath: false, ai: { maxChase: 12, minGap: 2, calmFirst: true } }, [
        PokemonSkills.flag("deepBreath", "深长呼吸"),
        meditateChase,
        meditateGap,
        meditateCalm
    ]);
}
