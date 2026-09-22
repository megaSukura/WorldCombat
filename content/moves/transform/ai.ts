/**
 * 变身 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有一个可见、存活、非友方的宝可梦身体可以描形，在 ai.maxChase 以内、有一条通视直线。
 *   正在变身的对手不能复制，自己已经在变身中也不重复。是否为「值得借的形态」用 minPower 排序，不放进 available——
 *   否则面对弱招目标时伙伴会以为无招可用而退开。
 * 对谁出手：当前威胁可复制就直接描它；威胁是不可复制的对象（原版生物、玩家）时，就近挑一个可复制的宝可梦身体。
 *   由共用服务走近到通视射程后再描形。
 * 候选之间怎么排：对手最高招式威力 ≥ 80 时 priority 55，达到 minPower 时 30，低于 minPower 时 6（仍会贴近）。
 * 够不到怎么办：reach 就是本招射程（特攻与体型决定），accepts 不按距离硬拒，共享任务先走近再描。
 * 放完之后：自己换上对手的招式、六维、类型与特性，交回共享交战计划；形态有时限，也会被清除提前收回。
 * 配置 dwell（深扮／浅扮）改变形态时长与冷却；ai.maxChase、ai.minPower、ai.leaveStation 决定追多远、多强的形态才优先借、驻守时是否离位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_transform/power", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return 0;
        const pokemon = CobblemonCombat.pokemon(actor);
        let best = 0;
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move !== null) best = Math.max(best, move.power());
        }
        return best;
    });

    function transformWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.domain(context, target) !== "cobblemon") return false;
        if (CompanionBehavior.status(context, target, transformStatus)) return false;
        if (CompanionBehavior.status(context, CompanionBehavior.source(context), transformStatus)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }
    /** 一个真的能被描形的身体：非友方、存活、可见的宝可梦，且不在变身中。 */
    function transformCopyable(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): boolean {
        if (subject.health <= 0 || subject.friendly || !subject.visible) return false;
        if (CompanionBehavior.domain(context, subject) !== "cobblemon") return false;
        if (CompanionBehavior.status(context, subject, transformStatus)) return false;
        return String(subject.ref) !== String(CompanionBehavior.source(context).ref);
    }
    /**
     * 能描形的对象：提议的对象本身可复制就用它；提议的只是「眼前威胁」（原版生物、玩家之类的不可复制对象）时，
     * 换最近的一个可复制身体——对手不总是宝可梦，变身要挑得动的那一个。没有可复制对象就放弃本次。
     */
    function transformPick(context: WorldBehavior.Context, item: WorldBehavior.Capability, proposed: CompanionBehavior.Entity): CompanionBehavior.Entity | null {
        if (transformCopyable(context, proposed)) return proposed;
        const self = CompanionBehavior.source(context), limit = CompanionBehavior.ai<number>(item, "maxChase", 12);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let best: CompanionBehavior.Entity | null = null, bestDistance = Infinity;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!transformCopyable(context, other)) continue;
            const gap = CompanionBehavior.distance(self.point, other.point);
            if (gap > limit || gap >= bestDistance) continue;
            best = other; bestDistance = gap;
        }
        return best;
    }

    CompanionBehavior.registerUse(transformId, {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return target === null ? true : transformWants(context, item, target); },
        selectTarget: function (context, item, proposed) { return transformPick(context, item, proposed); },
        target: function (context, item, target) { return transformPick(context, item, target); },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.domain(context, target) === "cobblemon"
                && !CompanionBehavior.status(context, target, transformStatus);
        },
        priority: function (context, item, target) {
            if (target === null || !transformWants(context, item, target)) return 0;
            const power = CompanionBehavior.fact<number>(context, "world_combat:move_transform/power", target);
            if (power === null) return 6;
            if (power >= 80) return 55;
            return power >= CompanionBehavior.ai<number>(item, "minPower", 30) ? 30 : 6;
        }
    });

    addPreferences(transformId, { dwell: true, ai: { maxChase: 12, minPower: 30, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 3, 20, 1),
        number("ai.minPower", "最低威力", 20, 120, 5),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
