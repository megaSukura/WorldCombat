/**
 * 龙锤 / dragonhammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 6）以内的贴身距离；更远交给共享接近逻辑。
 * 对谁出手：起手慢、只砸一个点，所以优先砸**焦点目标**与**已经受伤的目标**（把这一记重的砸成收尾）。
 *   重锤式偏爱站定/移动慢的目标——垂直弧更容易落在原地；疾锤式偏爱跑得快的近身目标——前抡更快、撞得更远。
 *   `ai.opening` 选「只对没被砸趴的目标」时跳过已经趴着的敌人，把这一锤留给还站着的目标（默认「随时」，被砸慢的目标照吃主伤）。
 * 弧线净空：按招式同一套几何量出举锤高点的真实空间——低顶/实墙下抡不起锤时大幅降低推荐，不只看直线距离。
 * 够不到交给共享接近逻辑；走进抡击范围、且头顶放得下锤，才抡下去。
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

    /** 举锤高点是否能容下施法者身体：与招式同一套 reach/wind-up 几何，同一决策帧内缓存。 */
    function dragonhammerArcClear(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "dragonhammer:arc:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const width = self.width === undefined ? 0.9 : self.width, height = self.height === undefined ? 1.4 : self.height;
            const reach = PokemonSkills.p("dragonhammer", "reach",
                { world: world, actor: world.source(), skill: PokemonSkills.skills["dragonhammer"], detail: { values: item.data.config } });
            const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
            const flat = Math.sqrt(dx * dx + dz * dz), length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            const lift = Math.max(-0.6, Math.min(0.9, dy / length));
            const topHeight = Math.max(0.6, height * 0.95 + reach * 0.35 - lift * 0.5);
            const hx = flat < 1e-6 ? 0 : dx / flat, hz = flat < 1e-6 ? 0 : dz / flat;
            const probe = WorldCombat.point(self.point[0] + hx * reach * 0.35, self.point[1] + topHeight, self.point[2] + hz * reach * 0.35);
            return world.freeSpace(probe, width, height);
        });
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
            // 低顶/墙下举不起锤：压到普通近战档以下，不朝顶棚浪费这一记。
            if (!dragonhammerArcClear(context, capability, target)) base -= 14;
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
