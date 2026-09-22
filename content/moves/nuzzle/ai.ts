/**
 * 蹭蹭脸颊 / nuzzle —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control／attack 位上。带蹭蹭脸颊的伙伴把它当作近身的必麻手段：
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 9）以内才考虑；更远交给共享接近逻辑，因为射程只到脸上。
 * 对谁出手：`ai.seekUnparalysed`（默认开）打开时，已经麻住的目标直接不算候选——蹭上去的必麻会被浪费；
 *   `ai.preferFast`（默认开）打开时，正在快速移动的目标优先级更高，追上去蹭住跑得快的那个。
 * 够不到怎么办：射程交给 `reach`（本族最短），共享任务负责把身位送进接触距离；这段接近就是它的风险。
 * 放完之后：目标必定带上麻痹身份，伙伴交回共享顺序；没蹭到只留一下扑空，冷却很短，可以再扑一次。
 * 优先级：基础 30（未麻的近身目标）；快速移动 +14。
 */
namespace PokemonSkills {
    /** 目标是否正在快速移动：追上去蹭住它最值。 */
    function nuzzleFast(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    CompanionBehavior.registerUse(nuzzleId, {
        protocols: ["world_combat:control", "world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnparalysed", true) && CompanionBehavior.status(context, target, "paralysis")) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return 0;
            return 30 + (CompanionBehavior.ai<boolean>(capability, "preferFast", true) && nuzzleFast(target) ? 14 : 0);
        }
    });

    addPreferences(nuzzleId, {}, [
        field(pathOf("pounce"), "猛扑式", "boolean", {
            help: "开启：前扑距离 ×1.35、起手距离 ×1.3，能追上更远的跑动目标，但起手多 2 刻、收招 ×1.35、蹭击威力 ×0.9；关闭：短蹭，起手与收招更快、蹭得略重，代价是必须贴得更近。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "只有在这个距离以内才把对方列为扑击候选，再由共享接近逻辑把身位送进接触距离；射程只到脸上，调大就是更早开始追。"
        }),
        field(pathOf("ai.seekUnparalysed"), "只蹭未麻目标", "boolean", {
            help: "开启后，已经麻住的目标不算候选——蹭上去的必麻会被浪费；关闭则不管是否已麻都照蹭。"
        }),
        field(pathOf("ai.preferFast"), "优先快目标", "boolean", {
            help: "开启后，正在快速移动的目标优先级更高，追上去蹭住跑得快的那个；关闭则所有威胁一视同仁。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为蹭到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
