/**
 * 轮唱 / round 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 12）之内；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛身份与距离之外的事实（阵营、存活、可见），谁当前被主线盯上就唱给谁。
 * 排序：这是合唱的引子，所以排序按「自己和同伴在不在轮里」分三档——
 *   自己带着余韵（world_combat:status/round）＝接上伙伴的那一句，翻倍，最高；唱出时这一份余韵会被消费，
 *   所以这个加分只在真的接到歌的时候出现，不会因为曾经收过就永久挂在身上；
 *   `ai.joinRound` 打开且附近有同伴带着余韵＝起唱把歌接续下去，次之；
 *   都不成立＝起唱，普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进歌程之后再唱。
 * 放完接什么：交回共享交战计划；句子的余韵留在同伴身上，他们自己决定接不接。
 */
namespace PokemonSkills {
    /** 附近有没有正在轮唱的同伴：按共享身份读，不看是谁唱的。 */
    function roundAllyInRound(context: WorldBehavior.Context): boolean {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const self = String(context.actor);
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (!other.friendly || other.health <= 0 || other.ref === self) continue;
            if (CompanionBehavior.status(context, other, "round")) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(roundId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.status(context, self, "round")) return 46;
            if (CompanionBehavior.ai<boolean>(capability, "joinRound", true) && roundAllyInRound(context)) return 34;
            return 24;
        }
    });

    addPreferences(roundId, {}, [
        field(pathOf("lead"), "领唱", "boolean", {
            help: "开启：传唱半径 ×1.35、余韵 ×1.3，更容易把句子交给同伴，但自己这句威力 ×0.94、起手多 2 刻、冷却多 3 刻；关闭：留给自己唱，威力更足。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不起唱，先走近；越大越愿意从更远处开腔。"
        }),
        field(pathOf("ai.joinRound"), "接同伴的轮唱", "boolean", {
            help: "开启：附近有同伴正在轮唱时优先接上去，维持合唱；关闭：只在自己带着余韵时优先，否则当普通远程攻击排序。"
        })
    ]);
}
