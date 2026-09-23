/** grudge：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    registerUse("grudge", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = source(context);
            if (marker(context, self, PokemonSkills.grudgeEffect)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.5)) return false;
            return distance(self.point, threat.point) <= ai<number>(capability, "maxChase", 10);
        },
        priority: function (context, capability, _target) {
            const self = source(context);
            return ratio(self) < 0.25 ? 70 : 40;
        }
    });

    PokemonSkills.addPreferences("grudge", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "立怨血量", "number", {
            min: 0.2, max: 0.8, step: 0.05,
            help: "生命比例低于这个值才立下怨念；调大更早把「补刀」标价，调小只在真的快倒下时用。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离内才考虑立怨；调小只在贴身时用，调大愿意追出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去立怨。"
        })
    ]);
}
