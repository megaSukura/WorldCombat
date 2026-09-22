/**
 * 鹦鹉学舌 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：目标可见、敌对、存活，在 ai.maxChase 以内且有一条通视直线，而且它最近出过一手带 mirror 旗标的
 *   已实装招式（决策内缓存读取）。
 * 对谁出手：当前威胁；只有它上一手真的可折时才纳入候选，没出过手不空放。
 * 候选之间怎么排：可折的那一手是伤害类且威力不低时 priority 抬到 46；其余 26。
 * 够不到怎么办：射程交给 reach（特攻与体型决定），共享任务把身位收进通视射程后再判断。
 * 放完接什么：交回共享交战计划；折返是对手那一手的镜像，不改变自身状态。
 * 配置 keen（锐镜）让折返威力 ×1.2、记忆更久，代价是起手更慢、冷却更长。
 */
namespace PokemonSkills {
    /** 只读、决策内缓存：目标最近一次可折返的招式 id；空串表示没有。 */
    CompanionBehavior.registerFact("world_combat:mirrormove-last", function (access, actor, _argument) {
        return mirrorRead(access, actor);
    });

    function mirrorPower(id: string): number {
        try { return CobblemonCombat.moveTemplate(id).power(); } catch (error) { return 0; }
    }

    CompanionBehavior.registerUse(mirrormoveId, {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) return false;
            return !!CompanionBehavior.fact<string>(context, "world_combat:mirrormove-last", target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, _item, target) {
            if (!target) return 0;
            const id = CompanionBehavior.fact<string>(context, "world_combat:mirrormove-last", target);
            if (!id) return 0;
            const power = mirrorPower(id);
            return power >= 60 ? 46 : 26;
        }
    });

    addPreferences(mirrormoveId, {}, [
        flag("keen", "锐镜"),
        number("ai.maxChase", "还手距离", 3, 22, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
