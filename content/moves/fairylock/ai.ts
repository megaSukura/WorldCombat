/**
 * 妖精之锁 的伙伴 AI 用途：这招自己的一套出手计划——把整块场地连人带己一起封住。
 *
 * 什么局面有意义：自己身上还没有封印，且有可见威胁在 `ai.maxChase`（默认 10）格以内。
 *   半径内（`item.data.range`）的敌对活体数达到 `ai.minTargets`（默认 1）时抬价（每个 +10）——关住的人越多越值；
 *   有正在逃跑的目标时额外加分（`ai.catchRunners` 默认开）：它正要离开，一圈光栅正好把出口封上。
 * 对谁出手：当前威胁；光栅以自身为中心，共享任务把身位收进封印半径后再放。
 * 够不到怎么办：reach 就是封印半径，超出先走近。
 * 放完之后：圈里的人（包括术者）都被钉住，交回共享交战顺序，由队友接手集火。
 */
namespace CompanionBehavior {
    function fairylockHostilesWithin(context: WorldBehavior.Context, radius: number, threat: Entity | null): number {
        const nearby: Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(source(context).point, other.point) <= radius + 0.5) count++;
        }
        if (count === 0 && threat !== null && !threat.friendly && threat.health > 0
            && distance(source(context).point, threat.point) <= radius + 0.5) count = 1;
        return count;
    }

    function fairylockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        const self = source(context);
        if (status(context, self, "fairy_locked")) return false;
        if (threat === null || threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus !== threat.ref
            && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        const radius = item.data.range;
        if (fairylockHostilesWithin(context, radius, threat) >= ai<number>(item, "minTargets", 1)) return true;
        return ai<boolean>(item, "catchRunners", true) && fleeing(context, threat);
    }

    registerUse("fairylock", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (status(context, source(context), "fairy_locked")) return false;
            return target === null ? true : fairylockWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !fairylockWants(context, item, target)) return 0;
            const caught = fairylockHostilesWithin(context, item.data.range, target);
            let score = 30 + caught * 10;
            if (ai<boolean>(item, "catchRunners", true) && fleeing(context, target)) score += 14;
            if (context.facts.focus === target.ref) score += 8;
            return Math.min(96, score);
        }
    });

    PokemonSkills.addPreferences("fairylock", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑落锁；越大越早铺开、也越容易把自己一起关在远场。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minTargets"), "关人门槛", "number", {
            min: 1, max: 5, step: 1,
            help: "半径内的敌对活体达到这么多才落锁；调 1 见一个就锁，调大只在对手聚成堆时才值得对等封场。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.catchRunners"), "优先逃跑目标", "boolean", {
            help: "开启：有目标正在逃跑时多一档分——一圈光栅把出口封上；关闭：只按关住的人数排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时离位", "boolean", {
            help: "开启后，驻守命令下也会离开原位去封场；关闭则只在原地够得到时出手。"
        })
    ]);
}
