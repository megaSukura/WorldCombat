/**
 * 污泥攻击 / sludge —— 伙伴 AI 用途。
 *
 * 什么局面下出手：远程基础消耗手段，挂在共享 attack／ranged 位上。目标可见、敌对、存活、在 `ai.maxChase`
 *   （默认 11）以内就考虑出手；够不到交给共享接近逻辑。它是这一族里最不挑局面的一招：便宜、冷却短、PP 多，
 *   只要还有 PP 就会反复丢。
 * 对谁出手：`ai.seekUnpoisoned`（默认开）时，已经中毒的目标不算候选——毒还在走，再糊一发只会刷新它；
 *   关闭则不管是否已毒都照丢。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进投掷距离。
 * 放完之后：目标按概率带毒，伙伴交回共享顺序；落空只走冷却。
 * 优先级：未毒且在射程内 22／还需走近 6。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("sludge", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true) && CompanionBehavior.status(context, target, "poison")) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 11)) return 0;
            return distance <= capability.data.range ? 22 : 6;
        }
    });

    addPreferences("sludge", {}, [
        field(pathOf("cling"), "黏附形态", "boolean", {
            help: "开启：泥团更大（判定 ×1.2）、中毒概率 ×1.3、挂毒更久，但威力 ×0.9、飞得慢、起手多一拍，适合缠住对手慢慢磨。关闭（快掷）：丢得更快更重（威力 ×1.1），但糊上去的机会小。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 18, step: 1,
            help: "只有在这个距离以内才把对方列为投掷候选，再由共享接近逻辑把身位送进投掷距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.seekUnpoisoned"), "只丢未毒目标", "boolean", {
            help: "开启后，已经中毒的目标不算候选——重糊只会刷新已有的毒，不如换个目标；关闭则不管是否已毒都照丢。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为丢到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
