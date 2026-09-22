/**
 * 扎根 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己血量低于 ai.healBelow（默认 0.75）、还没有扎根、且踩着地。
 * 什么时候最想出手：开启 ai.rootGuard（默认）时，威胁已经进入 ai.maxChase 以内才扎根——把自己钉住需要一个理由；
 *   危险近、血线低时 priority 50，否则 25。已经扎了根就不再重复（ready 会拒绝），
 *   也不在太远的地方白扎（关闭 rootGuard 时例外：只要受伤就扎）。
 * 对谁出手：只有自己（kind self），不需要接近。
 * 放完之后：共享 rooted 把自己钉住、根须按 interval 抽血；根被清除或走完自动拔根，伙伴回到共享计划。
 */
namespace CompanionBehavior {
    const ingrainBelow = PokemonSkills.number("ai.healBelow", "扎根血量", 0.3, 1, 0.05);
    ingrainBelow.help = "自身生命低于这个比例时，伙计把扎根排进续航计划；调低更倾向先打，调高则一受伤就扎根。";
    const ingrainChase = PokemonSkills.number("ai.maxChase", "守根距离", 3, 24, 1);
    ingrainChase.help = "开启「只守不逃」时，威胁进入这个距离内才扎根；越大越愿意在远处先扎下。";
    const ingrainGuard = PokemonSkills.flag("ai.rootGuard", "只守不逃");
    ingrainGuard.help = "开启：只在威胁进入守根距离时扎根，把自己钉住前先确认有人要打；关闭：只要受伤就扎根，不在意外面有没有威胁。";

    registerUse("ingrain", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function (context) { return !status(context, source(context), "ingrain"); },
        available: function (context, item) {
            const self = source(context);
            if (context.facts.mounted || status(context, self, "ingrain")) return false;
            if (ratio(self) >= ai<number>(item, "healBelow", 0.75)) return false;
            if (self.grounded === false) return false;
            if (!ai<boolean>(item, "rootGuard", true)) return true;
            const threat = context.senses["world_combat:threat"];
            return !!threat && distance(self.point, threat.point) <= ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item) {
            const self = source(context);
            if (status(context, self, "ingrain")) return 0;
            if (ratio(self) >= ai<number>(item, "healBelow", 0.75)) return 0;
            if (ai<boolean>(item, "rootGuard", true)) {
                const threat = context.senses["world_combat:threat"];
                if (!threat || distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return 25;
            }
            return 50;
        }
    });

    PokemonSkills.addPreferences("ingrain", { deep: false, ai: { healBelow: 0.75, maxChase: 12, rootGuard: true } }, [
        PokemonSkills.flag("deep", "深扎"),
        ingrainBelow,
        ingrainChase,
        ingrainGuard
    ]);
}
