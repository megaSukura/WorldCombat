/**
 * 焕然一新 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己身上带着毒／灼／麻三类主异常之一；这不是伤害或控制招，而是自净，
 *   所以只在真被挂上异常时才提出来（已带清爽窗口时也不必再净）。
 * 对谁出手：只有自己（kind self），reach 0。
 * 什么时候最急：中毒／灼伤又已经把自己磨到 ai.cleanseBelow 以下，或麻痹时敌人已贴到近处（行动会被打乱）→ priority 100，
 *   越过共享交战次序先净息；否则 40，等手里的攻击与控制都告一段落再顺手清一下。
 * 配置：deep（深息／速净）在参数层改变起手、冷却与清爽窗口；ai.cleanseBelow 决定多低才算急。
 */
namespace CompanionBehavior {
    const refreshCleanseBelow = PokemonSkills.number("ai.cleanseBelow", "净息血量", 0.2, 0.95, 0.05);
    refreshCleanseBelow.help = "中毒或灼伤把自己磨到这个比例以下时，伙计把这招当作紧急的自救；调低更倾向硬撑，调高则一受伤就净息。";

    PokemonSkills.addPreferences("refresh", { deep: false, ai: { cleanseBelow: 0.6 } }, [refreshCleanseBelow]);

    function refreshAfflicted(context: WorldBehavior.Context, self: Entity): string {
        for (let index = 0; index < PokemonSkills.refreshAfflictions.length; index++) {
            const name = PokemonSkills.refreshAfflictions[index];
            if (status(context, self, name)) return name;
        }
        return "";
    }

    registerUse("refresh", {
        protocols: ["world_combat:prepare"],
        reach: function () { return 0; },
        ready: function (context) { return refreshAfflicted(context, source(context)) !== ""; },
        available: function (context) { return !context.facts.mounted && refreshAfflicted(context, source(context)) !== ""; },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        priority: function (context, item) {
            const self = source(context), name = refreshAfflicted(context, self);
            if (!name) return 0;
            const urgent = name === "burn" || name === "poison" || name === "toxic";
            if (urgent && ratio(self) < ai<number>(item, "cleanseBelow", 0.6)) return 100;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (name === "paralysis" && threat && distance(threat.point, self.point) <= 6) return 100;
            return 40;
        }
    });
}
