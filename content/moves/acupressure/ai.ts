/** 近身前给自己或附近伙伴点穴，通畅结束后再考虑下一轮。 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("acupressure", {
        protocols: ["world_combat:fortify", "world_combat:bolster"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const self = CompanionBehavior.source(context);
            if (!target) return true;
            if (!target.friendly || target.health <= 0) return false;
            if (CompanionBehavior.status(context, target, "acupressure")) return false;
            if (String(target.ref) === String(self.ref)
                && CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            const slack = CompanionBehavior.distance(self.point, target.point) - CompanionBehavior.ai<number>(capability, "maxChase", 6);
            return slack <= capability.data.range;
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.health > 0 && !CompanionBehavior.status(context, target, "acupressure");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (String(target.ref) !== String(self.ref)) return 68;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            return CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2) ? 0 : 92;
        }
    });

    addPreferences("acupressure", {}, [
        field(pathOf("ai.maxChase"), "协助距离", "number", {
            min: 0, max: 20, step: 1,
            help: "伙伴离自己这个距离以内才考虑去点；调大愿意主动靠过去帮同伴按压。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再给自己点穴、直接应对；调大更常在近身时放弃强化。"
        })
    ]);
}
