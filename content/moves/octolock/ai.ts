/**
 * 蛸固 的伙伴 AI 用途：这是这招自己的一套出手计划——贴上去缠死一个目标，再一层层削软它。
 *
 * 什么局面有意义：有可见、存活、敌对的威胁，在 `ai.maxChase`（默认 8）格以内，且身上还没有被蛸固缠住。
 *   目标生命越满、越难缠越值得先缠住（缠住的是「不让你走、还越削越软」，不是补最后一下）；焦点目标另加一档。
 * 对谁出手：当前威胁；已经被蛸固缠住的目标跳过，不浪费一次缠绕。已被别的手段定住的目标照缠——双防照削。
 * 够不到怎么办：reach 就是触手伸出距离，超出先走近；触手够短，多数时候需要靠身。
 * 放完之后：目标被钉在原地、每拍双防下降，术者留在这片地方继续打；走出维持距离或术者倒下，触手自动松开。
 * 配置 coil（缠紧）：勒得更密、维持更牢，但伸出更近、冷却更长。
 */
namespace CompanionBehavior {
    function octolockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.friendly || threat.health <= 0 || !threat.visible) return false;
        if (status(context, threat, "octolock")) return false;
        if (context.facts.focus === threat.ref) return true;
        return distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 8);
    }

    registerUse("octolock", {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            return target === null ? true : octolockWants(context, item, target);
        },
        accepts: function (context, _item, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "octolock");
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !octolockWants(context, item, target)) return 0;
            let score = 18;
            if (CompanionBehavior.ai<boolean>(item, "preferTanky", true)) score += Math.round(ratio(target) * 34);
            else score += 12;
            if (context.facts.focus === target.ref) score += 16;
            return Math.min(92, score);
        }
    });

    PokemonSkills.addPreferences("octolock", { ai: { maxChase: 8, preferTanky: true } }, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑缠绕；调小只在贴身时出手，调大愿意先拉近再缠。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.preferTanky"), "优先厚目标", "boolean", {
            help: "开启：生命比例越高、越难缠的目标排名越靠前（缠住的是持续削防的消耗，不是补刀）；关闭则一律按普通交战排序。"
        })
    ]);
}
