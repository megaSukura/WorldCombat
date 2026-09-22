/**
 * 音速拳 / machpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 5）格内。它不位移，所以真正的出手时机
 *   是**已经贴到一臂之内**：射程内它是全族最快的一拳（起手可到 0 刻），值得优先补一下；够不到就交给共享接近逻辑
 *   走过去，走过去之后它依然是最省的即时输出。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 优先次序：射程内基础 26；目标残血（≤三成）+18，正好用来补最后一下；目标的矛头正对着自己（即将打到身上）+10，
 *   抢在它前面把这一拳塞出去。射程外不进入候选。
 * 够不到怎么办：射程由 `reach` 决定，共享任务把身位收进拳程后再出拳。
 * 放完之后：交回共享交战计划；冷却短、没有前摇，适合跟在别的招后面连一下。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(machpunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 18;
            if (target.attacking === self.ref) score += 10;
            return score;
        }
    });

    addPreferences(machpunchId, {}, [
        field(pathOf("heavy"), "重拳式", "boolean", {
            help: "开启：这一拳重两成、顶开更远 25%、够得稍远 6%，但要先蓄一拍（起手 +2 刻）、收招 +2、冷却 +6。关闭：纯粹瞬发的快拳，没有前摇，伤害与冷却都更轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 1, max: 12, step: 1,
            help: "对手离自己这么远以内才把它算作候选；本招不位移、拳程最短，设大也只是先走过去再打。"
        })
    ]);
}
