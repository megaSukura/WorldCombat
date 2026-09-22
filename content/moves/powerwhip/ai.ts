/**
 * 强力鞭打 / powerwhip 的 AI 用途。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。它是一记远而宽的横扫，价值在于一次罩住挤在一起的一群对手。
 * 对谁出手：当前威胁；`ai.preferGroups`（默认开）会优先挑身边还挤着别的敌人的那个——一道弧面把一片清干净。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；弧面够远，不必贴脸。
 * 放完之后：命中者各被推开一段，交回共享交战计划继续挑下一个目标。
 */
namespace PokemonSkills {
    function powerwhipValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function powerwhipCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("powerwhip", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!powerwhipValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) { return powerwhipValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferGroups", true)) {
                const cluster = powerwhipCluster(context, target);
                if (cluster >= 2) score += 18;
                else if (cluster === 1) score += 9;
            }
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("powerwhip", {}, [
        field(pathOf("extend"), "长鞭式", "boolean", {
            help: "开启：够得更远、把少数目标推得更开，但弧度窄、只扫身前一线。关闭（旋身式）：原地整圈甩开、一次罩住四面八方，但够得更近、单发略轻、收招与冷却更久。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动挥鞭，先走近。弧面够远，调大可以更早出手。"
        }),
        field(pathOf("ai.preferGroups"), "先扫成群的", "boolean", {
            help: "开启：身边还挤着别的敌人的目标排得更前——一道弧面把一片清干净；关闭：只按威胁与距离排序。"
        })
    ]);
}
