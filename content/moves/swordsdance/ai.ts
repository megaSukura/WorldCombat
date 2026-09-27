namespace PokemonSkills {
    CompanionBehavior.registerUse("swordsdance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            // 已有窗口但物攻确实还没到上限时，允许再起舞把等级续满；已满则让位。
            if (CompanionBehavior.status(context, self, "swordsdance") && CompanionBehavior.stage(context, self, "atk") >= 6) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        // 自施放只借这个对象定出前压方向，宿主仍以自身为动作实体。
        target: function (context) {
            return context.senses["world_combat:threat"];
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
            const level=CompanionBehavior.stage(context,CompanionBehavior.source(context),"atk");
            const safe=CompanionBehavior.ai<number>(capability,"minGap",3)+(level>0?3:0);
            return gap<safe?0:level>0?22:65;
        }
    });

    addPreferences("swordsdance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先起舞；越大越早开始磨刃。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
