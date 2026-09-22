/**
 * 回声 / echoedvoice 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见；谁当前被盯上就唱给谁。
 * 排序：`ai.sustainEcho`（默认开）打开时，自己或附近有人身上还带着回声身份（world_combat:status/echoed_voice）
 *   就把 priority 抬到 42——接上这一层正是叠高的窗口；否则按普通远程 20 排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进歌程之后再唱。
 * 放完接什么：交回共享交战计划；回声留在自己身上，等下一个接的人（也可能是自己）。
 */
namespace PokemonSkills {
    function echoedvoiceEchoNearby(context: WorldBehavior.Context): boolean {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const self = String(context.actor);
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self || other.health <= 0) continue;
            if (CompanionBehavior.status(context, other, echoStatus)) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(echoId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return Math.min(capability.data.range, 5.6); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
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
