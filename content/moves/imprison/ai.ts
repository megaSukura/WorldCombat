/** imprison：行为、参数与目标条件以本单元实现为准。 */
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
            for (let j = 0; j < mine.length; j++) if ((other.domain !== "cobblemon" || mine[j].indexOf("native:") !== 0) && theirs.indexOf(mine[j]) >= 0) { count++; break; }
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
