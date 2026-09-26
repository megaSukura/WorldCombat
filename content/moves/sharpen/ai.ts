/**
 * 棱角化 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有威胁、还在 ai.maxChase 以内，且有交战需求时；身上还没有棱角才考虑。
 * 什么时候最想出手：开启 ai.retaliate（默认）时，威胁已经贴身（距离 < 4）priority 75，正好让对手撞上来吃反击；
 *   还在远处时降到 35，先顶角加攻也行但不抢次序。开启 ai.ranged（默认）时，若威胁最近一次攻击是非接触的（射弹/法术）、
 *   且还在近身之外，priority 再降到 20——远程 Boss 压制下少用这招贴脸反伤。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：物攻 +1、棱角窗口挂上，近身接触者被划伤；窗口走完物攻收回，伙伴再按上面的判断决定是否重顶。
 */
namespace CompanionBehavior {
    const sharpenChase = PokemonSkills.number("ai.maxChase", "顶角距离", 2, 24, 1);
    sharpenChase.help = "威胁进入这个距离内才考虑棱角化；越大越早顶出棱角。";
    const sharpenGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 6, 1);
    sharpenGap.help = "威胁近于这个距离时不再顶角、直接交战；调大更常在近身时放弃棱角化。";
    const sharpenRetaliate = PokemonSkills.flag("ai.retaliate", "诱敌反击");
    sharpenRetaliate.help = "开启：倾向于等对手贴上来（距离小于 4 格）再顶角，让接触者吃反击；关闭：远一点也不妨先顶角加攻。";
    const sharpenRanged = PokemonSkills.flag("ai.ranged", "忌惮远程");
    sharpenRanged.help = "开启：威胁最近一次攻击是射弹/法术、且还在近身之外时，伙计会压后棱角化，不在远程压制下白顶角；关闭：不分辨远程，照常按距离决定。";

    /** 威胁最近一次攻击是不是非接触（射弹/法术），用来在远程压制下收敛棱角化。 */
    function sharpenRangedThreat(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        try {
            const world = CompanionBehavior.world(context), actor = world.actor(threat.ref);
            if (actor === null) return false;
            const recent = DamageSemantics.recentAttack(world, actor, 80);
            return recent !== null && !recent.contact;
        } catch (ignored) { return false; }
    }

    registerUse("sharpen", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (status(context, self, "sharpened")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            const gap = distance(self.point, threat.point);
            if (gap > ai<number>(capability, "maxChase", 14)) return false;
            return gap >= ai<number>(capability, "minGap", 1);
        },
        accepts: function (context, _capability, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context);
            const gap = distance(self.point, threat.point);
            if (gap < ai<number>(capability, "minGap", 1) || status(context, self, "sharpened")) return 0;
            if (ai<boolean>(capability, "ranged", true) && gap >= 4 && sharpenRangedThreat(context, threat)) return 20;
            if (!ai<boolean>(capability, "retaliate", true)) return 55;
            return gap < 4 ? 75 : 35;
        }
    });

    PokemonSkills.addPreferences("sharpen", { quick: false, ai: { maxChase: 14, minGap: 1, retaliate: true, ranged: true } }, [
        PokemonSkills.flag("quick", "速成棱角"),
        sharpenChase,
        sharpenGap,
        sharpenRetaliate,
        sharpenRanged
    ]);
}
