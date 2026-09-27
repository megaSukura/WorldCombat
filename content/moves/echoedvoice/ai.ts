/**
 * 回声 / echoedvoice 的 AI 用途。
 *
 * 什么局面下出手：目标敌对、存活且在 `ai.maxChase`（默认 9）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营与存活——声音不被掩体阻挡，不需要当前视线，遮挡但已知的目标也能按记忆接唱。
 * 排序：`ai.sustainEcho`（默认开）打开时，用与服务端同一个 `echoedvoiceLayer` 判断附近（含自己）是否有
 *   可接的回声（发声者传播距覆盖到自己），有就把 priority 抬到 42——接上这一层正是叠高的窗口；否则按普通远程 20 排序。
 * 够不到怎么办：射程用真实歌程 `reach`（capability.data.range），共享任务把身位收进歌程之后再唱。
 * 放完接什么：交回共享交战计划；回声留在自己身上，等下一个接的人（也可能是自己）。
 */
namespace PokemonSkills {
    /** 统一接唱判定：读服务端同一个发声者传播距口径，本次能否在附近（含自己）找到可接的回声。 */
    function echoedvoiceEchoNearby(context: WorldBehavior.Context): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(CompanionBehavior.source(context).ref);
        return actor !== null && echoedvoiceLayer(world, actor) > 1;
    }

    CompanionBehavior.registerUse(echoId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "sustainEcho", true)
                && (CompanionBehavior.status(context, self, echoStatus) || echoedvoiceEchoNearby(context))) return 42;
            return 20;
        }
    });

    addPreferences(echoId, {}, [
        field(pathOf("crescendo"), "渐强式", "boolean", {
            help: "开启：传声半径 ×1.2、回声持续 ×1.35，更容易把合唱链接下去，但自己这一嗓 ×0.94。关闭：独唱式——基础 ×1.08、半径 ×0.85、持续 ×0.8，一个人也唱得响。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "目标离自己这么远以内才起唱，更远先走近；越大越愿意从远处接声。"
        }),
        field(pathOf("ai.sustainEcho"), "接回声", "boolean", {
            help: "开启后，自己或附近有人带着回声时优先接上去续层；关闭则按普通远程攻击排序。"
        })
    ]);
}
