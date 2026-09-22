/**
 * 夹住 / visegrip 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 6）以内的贴身距离；更远交给共享接近逻辑。
 * 对谁出手：这一夹对**钳口相对更小的目标**更实，也不容易被打断，所以优先挑体型比自己小的目标；
 *   焦点目标另加一档。`ai.opening` 选「只对受伤目标」时跳过血还多的敌人，把它留给残血收尾。
 * 够不到交给共享接近逻辑；走进钳夹距离就合钳、把人拽近。
 */
namespace CompanionBehavior {
    function visegripSmaller(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const mine = typeof self.height === "number" ? self.height : 1.4;
        const theirs = typeof target.height === "number" ? target.height : 1.4;
        return theirs <= mine + 0.15;
    }

    function visegripWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    registerUse("visegrip", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return visegripWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") === "wounded" && CompanionBehavior.ratio(target) > 0.6) return false;
            return true;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !visegripWants(context, capability, target)) return 0;
            let base = 22;
            if (visegripSmaller(context, target)) base += 8;
            if (CompanionBehavior.ratio(target) < 0.55) base += 6;
            if (context.facts.focus === target.ref) base += 12;
            return base;
        }
    });

    PokemonSkills.addPreferences("visegrip", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("haul"), "拖拽式", "boolean", {
            help: "开启：命中后把目标朝自己拽得更近（约 ×1.35）、射程略长，代价是这一夹更轻（约 ×0.9），用来把人拖进队友的射程。关闭（碾夹式）：这一夹更重（约 ×1.18），只把目标轻轻带近一点。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 1, max: 10, step: 1,
            help: "只在这个距离内主动合钳；更远的目标交给共享接近逻辑走过去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.opening"), "出手时机", "choice", {
            options: [
                { value: "anytime", label: "随时" },
                { value: "wounded", label: "只对受伤目标" }
            ],
            help: "选「只对受伤目标」时跳过血还多的敌人，把它留到目标掉到六成生命以下再拽过来收尾。"
        })
    ]);
}
