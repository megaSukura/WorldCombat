/**
 * 背水一战 的伙伴 AI 用途：这是这招自己的一套出手计划——用移动换一次全项强化。
 *
 * 什么局面有意义：有可见威胁、在 `ai.maxChase`（默认 12）格以内，自身生命比例高于 `ai.healthFloor`（默认 0.35），
 *   且身上还没有立过誓——立誓会把自己钉住，血太少时站着挨打不划算。
 * 什么时候最想出手：作为开打前的准备抬到 26，越过普通交战，先顶满再迎上去；生命见底时下限自然挡住。
 * 对谁出手：只有自己（kind self），不需要接近，由共用任务直接施放。
 * 放完之后：五项（疾战式三项）已写进能力阶梯，自己在这段时间里钉在原地；交回共享交战顺序正面打。
 */
namespace CompanionBehavior {
    function noRetreatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const self = source(context), threat = context.senses["world_combat:threat"];
        if (status(context, self, "noretreat")) return false;
        if (ratio(self) < ai<number>(item, "healthFloor", 0.35)) return false;
        if (!threat) return false;
        return distance(self.point, threat.point) <= ai<number>(item, "maxChase", 12);
    }

    registerUse("noretreat", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, _purpose, _target) { return noRetreatWants(context, item); },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) { return noRetreatWants(context, item) ? 26 : 0; }
    });

    PokemonSkills.addPreferences("noretreat", { ai: { healthFloor: 0.35 } }, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑立誓；越大越早顶满、也越可能在没贴上时先把自己钉住。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healthFloor"), "生命下限", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命比例低于此值就不立誓；调 0 表示残血也照立，调高只在满血附近才敢把自己钉住。"
        })
    ]);
}
