/**
 * 神奇蒸汽 / strangesteam —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 *   本招是地点招，AI 会把云铺在目标所在的位置。
 * 对谁出手：`ai.crowd`（默认开）打开时，目标身边还挤着别人排前——一片云能一次罩住几人；
 *   `ai.finish`（默认开）打开时残血目标排前；已经带着共享迷幻身份的目标排后。
 * 够不到怎么办：reach 就是喷射距离，不够先走近。
 * 放完之后：交回共享交战计划；云会留在落点，持续熏着进出的人。
 */
namespace PokemonSkills {
    function strangesteamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    function strangesteamCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let crowd = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 2.5) crowd++;
        }
        return crowd;
    }

    CompanionBehavior.registerUse(strangesteamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return strangesteamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !strangesteamWants(context, capability, target)) return 0;
            let score = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) score += Math.min(18, strangesteamCrowd(context, target) * 9);
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 7);
            if (CompanionBehavior.status(context, target, "confusion")) score -= 6;
            return score;
        }
    });

    addPreferences(strangesteamId, {}, [
        field(pathOf("dense"), "浓雾", "boolean", {
            help: "开启：云更大更久、迷幻概率更高时长更长，但首喷威力 ×0.85，适合封路与持续压制。关闭（喷发）：云更小更短、首喷 ×1.12、蒸汽更冲，代价是区域与持续更小，适合补一发就走。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动喷云，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.crowd"), "优先罩扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时排前，一片云能一次罩住多人；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用首喷收尾；关闭则所有目标同价。"
        })
    ]);
}
