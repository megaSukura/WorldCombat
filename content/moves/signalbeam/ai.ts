/**
 * 信号光束 / signalbeam —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 17）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.crowd`（默认开）打开时，目标身边还挤着别的敌人排前——一条宽走廊能一次兜住多人；
 *   `ai.finish`（默认开）打开时，残血目标排前；已经带着共享错乱身份的目标排后。
 * 够不到怎么办：reach 就是走廊长度，不够先走近。
 * 放完之后：交回共享交战计划；错乱的目标出手会打散、再挨打还会被信号反冲。
 */
namespace PokemonSkills {
    function signalbeamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    function signalbeamCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let crowd = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) crowd++;
        }
        return crowd;
    }

    CompanionBehavior.registerUse(signalbeamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return signalbeamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !signalbeamWants(context, capability, target)) return 0;
            let score = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 21 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) score += Math.min(16, signalbeamCrowd(context, target) * 8);
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            if (CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences(signalbeamId, { ai: { maxChase: 17, crowd: true, finish: true } }, [
        field(pathOf("pulse"), "脉冲", "boolean", {
            help: "开启：走廊更窄、单发 ×1.15、错乱概率 ×1.3，但射程 ×0.88，适合点名一个；关闭（连续）：走廊更宽更长、可一次兜住更多人，代价是单发与错乱概率更基础。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 28, step: 1,
            help: "超过这个距离就不主动照射，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "优先照扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时排前，一条宽走廊能一次兜住多人；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用它收尾；关闭则所有目标同价。"
        })
    ]);
}
