/**
 * 接棒 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有一个看得见、敌对、存活的威胁，且身边有一个队友在 `ai.maxChase`（默认 12）格内、
 *   身上还没有本招留下的接棒余韵（不连发）。自己越接近残废越急着把棒交出去。
 * 对谁出手：那个队友；不接受自己，也不接受敌人——棒要有一个人接。
 * 候选之间怎么排：自己生命比例低于 0.5 时 priority 80（把成长交出去、自己脱身），否则 55（顺手转交）。
 * 够不到怎么办：reach 就是递棒距离，共享任务会先走近那个队友；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：伙伴接手等级、自己退开一步，交回共享顺序；伙伴身上还有余韵时不再递。
 */
namespace CompanionBehavior {
    registerUse("batonpass", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (!target || target.health <= 0 || !target.visible) return false;
            const self = source(context);
            if (!target.friendly || String(target.ref) === String(self.ref)) return false;
            if (status(context, target, "baton_pass")) return false;
            return distance(self.point, target.point) <= ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.health > 0 && target.visible
                && String(target.ref) !== String(source(context).ref) && !status(context, target, "baton_pass");
        },
        priority: function (context, _capability, target) {
            if (!target || !target.friendly || target.health <= 0) return 0;
            return ratio(source(context)) < 0.5 ? 80 : 55;
        }
    });

    const batonpassChase = PokemonSkills.number("ai.maxChase", "递棒距离", 3, 20, 1);
    batonpassChase.help = "队友在这个距离以内才考虑递棒；调小只在贴身时转交，调大愿意主动靠过去。";
    const batonpassLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    batonpassLeave.help = "开启后，收到「驻守」指令时也会离开原位去把棒交给队友。";

    PokemonSkills.addPreferences("batonpass", {}, [batonpassChase, batonpassLeave]);
}
