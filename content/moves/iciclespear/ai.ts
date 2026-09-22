/**
 * 冰锥的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格之内；更远交给共享接近逻辑。
 *   它是本族命中 100 的直飞连发，远距离也可靠，所以愿意从较远处先手，也适合当作稳定压制。
 * 对谁出手：`ai.finish`（默认关）打开时，残血目标多一档分，用这一梭收尾；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；冰锥直飞几乎不散，近距离也稳。
 * 放完之后：这一梭喷完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function iciclespearWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
    }

    CompanionBehavior.registerUse("iciclespear", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return iciclespearWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !iciclespearWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.4) score += 9;
            return score;
        }
    });

    addPreferences("iciclespear", {}, [
        field(pathOf("rime"), "霜附式", "boolean", {
            help: "开启：每根命中的霜寒高一个减速档次、霜寒时长 ×1.6、结霜范围 ×1.3，适合粘住目标并冻地；代价是锥数收在 3 根、间隔 +1 刻、单锥威力 ×0.9、起手 +2 刻、冷却 +4 刻。关闭（纯碎式）：锥数可到 5 根、单锥威力 ×1.1，代价是只留最浅的霜寒与更小的霜圈。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动射锥，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一梭冰锥收尾；关闭则所有目标同价。"
        })
    ]);
}
