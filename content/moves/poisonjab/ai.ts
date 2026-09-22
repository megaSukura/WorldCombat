/**
 * 毒击 / poisonjab —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／contact 位上。带毒击的伙伴把它当近身的重击手段：
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 9）以内才考虑；更远交给共享接近逻辑，因为出臂距离只到 4 格。
 * 对谁出手：`ai.seekUnpoisoned`（默认开）打开时，已经中毒的目标直接不算候选——伤口里的毒还没走完，
 *   重掷一次只会刷新它；关闭则不管是否已毒都照刺。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进出臂距离；这段接近就是它的风险。
 * 放完之后：目标按概率带上中毒身份并被顶开一点，伙伴交回共享顺序；没刺到只走冷却。
 * 优先级：基础 26（未毒且在出臂距离内）／6（还要先走近）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("poisonjab", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true) && CompanionBehavior.status(context, target, "poison")) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return 0;
            return distance <= capability.data.range ? 26 : 6;
        }
    });

    addPreferences("poisonjab", {}, [
        field(pathOf("deep"), "深刺式", "boolean", {
            help: "开启：深刺威力 ×1.12、中毒概率 ×1.12、顶开 ×1.15，但出臂距离 ×0.92、起手 +2 刻、收招 ×1.2，适合贴身缠斗。关闭（快刺）：出手快、够得远、收得快，但每一记更轻。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "只有在这个距离以内才把对方列为刺击候选，再由共享接近逻辑把身位送进出臂距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.seekUnpoisoned"), "只刺未毒目标", "boolean", {
            help: "开启后，已经中毒的目标不算候选——重刺只会刷新已有的毒，不如换个目标；关闭则不管是否已毒都照刺。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为刺到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
