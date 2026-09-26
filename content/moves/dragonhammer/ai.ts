/**
 * 龙锤 / dragonhammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 6）以内的贴身距离；更远交给共享接近逻辑。
 * 对谁出手：起手慢、只砸一个点，所以优先砸**焦点目标**与**已经受伤的目标**（把这一记重的砸成收尾）。
 *   重锤式偏爱站定/移动慢的目标——垂直弧更容易落在原地；疾锤式偏爱跑得快的近身目标——前抡更快、撞得更远。
 *   `ai.opening` 选「只对没被砸趴的目标」时跳过已经趴着的敌人，把这一锤留给还站着的目标（默认「随时」，被砸慢的目标照吃主伤）。
 * 够不到交给共享接近逻辑；走进抡击范围就抡下去。
 */
namespace CompanionBehavior {
    function dragonhammerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    /** 目标当前水平速度（块/刻）；没有速度事实时按 0 处理。 */
    function dragonhammerMoving(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity || [0, 0, 0];
        return Math.sqrt((velocity[0] || 0) * (velocity[0] || 0) + (velocity[2] || 0) * (velocity[2] || 0));
    }

    registerUse("dragonhammer", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dragonhammerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") === "not-downed" && CompanionBehavior.status(context, target, "knocked_down")) return false;
            return true;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !dragonhammerWants(context, capability, target)) return 0;
            let base = 26;
            const heavy = !(capability.data.config && capability.data.config.heavy === false);
            const moving = dragonhammerMoving(target);
            if (heavy && moving < 0.08) base += 6;
            if (!heavy && moving > 0.12) base += 6;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") !== "not-downed" && CompanionBehavior.status(context, target, "knocked_down")) base += 4;
            if (!CompanionBehavior.status(context, target, "knocked_down")) base += 6;
            if (CompanionBehavior.ratio(target) < 0.5) base += 6;
            if (context.facts.focus === target.ref) base += 14;
            return base;
        }
    });

    PokemonSkills.addPreferences("dragonhammer", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("heavy"), "重锤式", "boolean", {
            help: "开启：威力约 ×1.15、趔趄约 ×1.3、击飞收到约 ×0.8、起手 +3 刻、冷却 +8 刻、垂直弧多 1 刻，砸得更重更久、把人钉在原地。关闭（疾锤式）：击飞约 ×1.25、射程约 ×1.1、起手更快、弧少 1 刻，代价是威力约 ×0.9、趔趄更短。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 1, max: 10, step: 1,
            help: "只在这个距离内主动抡砸；更远的目标交给共享接近逻辑走过去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.opening"), "出手时机", "choice", {
            options: [
                { value: "anytime", label: "随时" },
                { value: "not-downed", label: "只对未被砸趴的目标" }
            ],
            help: "选「只对未被砸趴的目标」时跳过已经趴着的敌人，把这一锤留给还站着的目标；默认「随时」时被砸慢的目标照吃不误。"
        })
    ]);
}
