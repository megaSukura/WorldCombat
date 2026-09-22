/**
 * 抛下狠话 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个看得见、敌对、存活的对手在 `ai.maxChase`（默认 12）格内，且它身上还没有本招的羞辱身份
 *   （不重复削）。这招不造成伤害，只有把对手的输出削下去这一件事。
 * 对谁出手：当前的威胁；它正打着自己时更值得先废掉它的手。
 * 候选之间怎么排：自己生命比例低于 0.5 时 priority 68（撤退前先削），否则 46；对手正攻击自己再 +4。
 * 够不到怎么办：reach 就是话声射程，共享任务会先走近到射程内再甩话。
 * 放完之后：对手物攻与特攻各降数级，施法者已经退开；对手身上有羞辱身份时不再重复。
 */
namespace CompanionBehavior {
    registerUse("partingshot", {
        protocols: ["world_combat:control"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target || target.health <= 0 || !target.visible || target.friendly) return false;
            if (status(context, target, "parting_shot")) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "parting_shot");
        },
        priority: function (context, capability, target) {
            if (!target || target.friendly || target.health <= 0) return 0;
            const self = source(context), threat = context.senses["world_combat:threat"] as Entity | null;
            const base = ratio(self) <= 0.5 ? 68 : 46;
            return base + (threat && threat.ref === target.ref && threat.attacking === self.ref ? 4 : 0);
        }
    });

    const partingshotChase = PokemonSkills.number("ai.maxChase", "甩话距离", 3, 20, 1);
    partingshotChase.help = "对手在这个距离以内才考虑甩狠话；调小只在贴身时用，调大更早开口。";
    const partingshotLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    partingshotLeave.help = "开启后，收到「驻守」指令时也会离开原位去甩话。";

    PokemonSkills.addPreferences("partingshot", {}, [partingshotChase, partingshotLeave]);
}
