/**
 * 起风 / gust 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   这是便宜、回得快的远程一记，偏好从稍远处先手。
 * 对谁出手：`ai.flyers`（默认开）打开时，正离地/飞在空中的目标多一档分（起风对空中的目标吹得更远）；
 *   关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近。风弹会小幅追踪，目标走位通常仍会被追上。
 * 放完之后：一发即散，交回共享交战计划等很短的冷却再扇下一团。
 */
namespace PokemonSkills {
    function gustWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse("gust", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return gustWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !gustWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "flyers", true) && target.grounded === false) score += 9;
            return score;
        }
    });

    addPreferences("gust", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不扇风，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.flyers"), "优先吹空中的", "boolean", {
            help: "开启：正离地/飞在空中的目标排得更前（起风把它们吹得更远）；关闭则所有目标同价。"
        })
    ]);
}
