/**
 * 乱抓 / furyswipes —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带乱抓的伙伴把它当**贴身连抓**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 6）以内就出手；乱抓会自己绕圈，所以比站定招更愿意贴上去；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；`ai.finish`（默认开）打开且目标生命已低于
 *   四成时排得更前——用这一趟快抓收掉残血。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：一趟抓完（或抓空）就收势，交回共享交战计划等冷却。
 * 优先级：基础 18；已在射程内 +8；残血且 `ai.finish` 开启 +8。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function furyswipesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
    }

    registerUse("furyswipes", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return furyswipesWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !furyswipesWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            let score = 18;
            if (distance <= item.data.range) score += 8;
            if (ai<boolean>(item, "finish", true) && ratio(target) < 0.4) score += 8;
            return score;
        }
    });

    PokemonSkills.addPreferences("furyswipes", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("pounce"), "扑抓式", "boolean", {
            help: "开启（扑抓）：改为朝目标前压、每道威力 ×1.08、爪距 ×1.12，把目标按在一面猛抓；代价是张角 ×0.8（收窄成一道）、几乎不侧移、命中率 −3%、间隔 +1 刻。关闭（游走）：左右交替绕圈、张角 ×1.12、换位 ×1.25、命中率 +3%，逼目标不停转身；代价是每道 ×0.9、爪距 ×0.92。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动扑上去抓，先走近。它是贴身招，越大越愿意从稍远处起手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：目标生命低于四成时更愿意用这趟快抓收掉它；关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为乱抓离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
