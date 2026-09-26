/**
 * 身体轻量化 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时，先卸一轮再交战；威胁站在略高的地面、需要跨一小级台阶才能贴上时，
 *   这是本招相比同类提速招（直接加速、滑步）唯一的用法——它真的改变跳跃与下落。
 * 什么时候最想出手：威胁还在 ai.minGap 之外时抢在共享次序前——趁还没贴上脸先把速度与轻身拿到手；
 *   目标高出一小截（跨小高差）时优先级更高；已经贴身就交回普通次序，不站着挨打。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：速度等级留在身上，轻身窗口内重力下调、跳得更高落得更慢；窗口内或换招前 30 秒内不再重复卸件。
 *   每一步都按当前决策帧重新读取共享身份，窗口结束后不会把已经还回去的重力当成还在，也不会据此误算落地节奏。
 */
namespace PokemonSkills {
    function autotomizeThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    /** 威胁相对自己的高度：正数表示威胁在更高处，需要跨一小级台阶才能贴近。 */
    function autotomizeThreatRise(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return 0;
        return threat.point[1] - CompanionBehavior.source(context).point[1];
    }

    CompanionBehavior.registerUse("autotomize", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (["spe"].every(function (stat) { return CompanionBehavior.stage(context, CompanionBehavior.source(context), stat) >= 6; })) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "lightened")) return false;
            if (CompanionBehavior.recent(context, "move", "autotomize", 600)) return false;
            const gap = autotomizeThreatGap(context);
            if (gap < 0) return false;
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = autotomizeThreatGap(context);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            const rise = autotomizeThreatRise(context);
            // A small step up is exactly the situation only this move handles, so it outranks the flat opening.
            return rise >= 0.6 && rise <= 3.5 ? 110 : 100;
        }
    });

    addPreferences("autotomize", {}, [
        field(pathOf("ai.maxChase"), "卸件距离", "number", {
            min: 3, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑卸件；越大越早准备。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再卸件、直接应对；调大更常在近身时放弃提速。"
        })
    ]);
}
