/**
 * 封印 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：身边有可见威胁，而且威胁里至少有一个与自己招式表重合——封印只锁双方都有的招，
 *   重合为 0 时立印毫无意义。已经带着封印身份时不再重复。
 * 对谁出手：自己；立起领域，不需要接近某个目标，由共用任务直接施放。
 * 候选之间怎么排：重合的对手越多、越近，priority 越高（默认 80），抢在普通交战动作前把领域铺开。
 * 够不到怎么办：领域半径由特攻与体型决定，ai.maxChase 是「多远以内的对手才值得为它立印」的取值；
 *   重合目标都在 ai.maxChase 之外时不出手。
 * 放完之后：领域随自己移动，重合招式被顶回去；领域到期或解除后对手恢复，再看局面。
 * 配置 scope（固守／广布）改变领域半径与时长；ai.maxChase 决定为多远的对手立印，ai.leaveStation 决定驻守时是否离位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_imprison/moves", function (access, actor, _argument) {
        return imprisonKnown(access, actor).join(",");
    });
    function imprisonWords(value: string | null): string[] {
        return value === null || value === "" ? [] : String(value).split(",");
    }
    /** 与自己招式表重合、且落在 ai.maxChase 内的可见敌对个体数量。 */
    function imprisonOverlaps(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const mine = imprisonWords(CompanionBehavior.fact<string>(context, "world_combat:move_imprison/moves", CompanionBehavior.source(context)));
        if (mine.length === 0) return 0;
        const self = CompanionBehavior.source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 14);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(self.point, other.point) > limit) continue;
            const theirs = imprisonWords(CompanionBehavior.fact<string>(context, "world_combat:move_imprison/moves", other));
            for (let j = 0; j < mine.length; j++) if (theirs.indexOf(mine[j]) >= 0) { count++; break; }
        }
        return count;
    }

    CompanionBehavior.registerUse(imprisonId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), imprisonStatus)) return false;
            return imprisonOverlaps(context, item) > 0;
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(CompanionBehavior.source(context).ref); },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, item, _target) {
            return context.senses["world_combat:threat"] && imprisonOverlaps(context, item) > 0 ? 80 : 0;
        }
    });

    addPreferences(imprisonId, { scope: 1, ai: { maxChase: 14, leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
