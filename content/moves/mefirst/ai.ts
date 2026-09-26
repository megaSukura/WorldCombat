/**
 * 抢先一步 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：目标可见、敌对、存活，在 ai.maxChase 以内且有一条通视直线——就地压下来守候它下一拍；
 *   它必须在守候窗口里出手，所以对走位中的目标会落空（不结账），AI 只在有真实威胁时才守候。
 * 对谁出手：当前威胁；它的矛头正对着自己时最值得抢。
 * 候选之间怎么排：目标正攻击自己时 priority 58；其余“有攻击迹象”的 34。
 * 够不到怎么办：射程交给 reach（特攻与体型决定），共享任务把身位收进通视射程后再守候。
 * 放完接什么：交回共享交战计划；夺来的那一手已先打出，抢空则照常继续。
 * 配置 patient（耐心）换取更长的守候窗口，代价是更慢的起手与更长的冷却。
 */
namespace PokemonSkills {
    function mefirstNativeReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const scope = CompanionBehavior.world(context), threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        const target = threat && scope.actor(threat.ref);
        if (!target || String(target.domain()) === "cobblemon") return item.data.range;
        const replay = NativeAttackProjection.recent(scope, target, 1200);
        return replay ? Math.min(item.data.range, NativeAttackProjection.reach(scope, scope.source(), replay)) : item.data.range;
    }

    CompanionBehavior.registerUse(mefirstId, {
        protocols: ["world_combat:attack"],
        reach: mefirstNativeReach,
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            const access = CompanionBehavior.world(context), opponent = access.actor(target.ref);
            if (!opponent || String(opponent.domain()) !== "cobblemon" && !NativeAttackProjection.recent(access, opponent, 1200)) return false;
            const self = CompanionBehavior.source(context);
            if (context.facts.focus !== target.ref
                && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, _item, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            return target.attacking === self.ref ? 58 : 34;
        }
    });

    addPreferences(mefirstId, {}, [
        flag("patient", "耐心"),
        number("ai.maxChase", "守候距离", 3, 22, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
