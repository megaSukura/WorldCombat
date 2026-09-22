/**
 * 画龙点睛 / dragonascent 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格之内；更远交给共享接近逻辑。
 *   这一记提交那一刻就弃守（自降防特防），只有在自身生命比例不低于 `ai.minHealth`（默认 0＝不限制）时才起手。
 * 对谁出手：它要先升空再下砸，越有点水平余量越有效——距离达到 `ai.airMargin`（默认 2.5）格时加一档，
 *   贴到 1.5 格以内减一档，让位给更贴身的招；`ai.finish`（默认开）打开时残血目标更高。
 * 够不到怎么办：reach 就是本招射程，先走到射程里；升空途中目标消失就落回原地，代价已经付过。
 * 放完之后：交回共享交战计划等冷却；落点裂石留在场上，但本招不因它改后续决策。
 */
namespace PokemonSkills {
    function dragonascentWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return false;
        const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0);
        return minHealth <= 0 || CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth;
    }

    CompanionBehavior.registerUse(dragonascentId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dragonascentWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !dragonascentWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = distance <= capability.data.range ? 16 : 0;
            const margin = CompanionBehavior.ai<number>(capability, "airMargin", 2.5);
            if (distance >= margin) score += 6; else if (distance <= 1.5) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 8;
            return score;
        }
    });

    addPreferences(dragonascentId, { broad: false, ai: { maxChase: 11, airMargin: 2.5, finish: true, minHealth: 0 } }, [
        field(pathOf("broad"), "广域式", "boolean", {
            help: "开启：落地冲击半径 ×1.3、击退 ×1.2，落点周围的其他敌人各吃一部分威力；代价是坠落威力 ×0.88、收招 +3 刻、冷却 +4 刻。关闭（贯坠式）：单点更重、出手更快、冲击更窄。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处就升空。"
        }),
        field(pathOf("ai.airMargin"), "升空余量", "number", {
            min: 0, max: 8, step: 0.5,
            help: "离目标至少这么远才会把它当主选；有一点水平余量才好爬升下砸。贴到 1.5 格以内分数压低、让位给更贴身的招。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一记从天上收掉；关闭则所有目标同价。"
        }),
        field(pathOf("ai.minHealth"), "最低生命比例", "number", {
            min: 0, max: 0.9, step: 0.1,
            help: "自身生命比例低于这个值就不主动升空下砸（0＝不限制）。调高能让它把这一记留给值得交换的局面。"
        })
    ]);
}
