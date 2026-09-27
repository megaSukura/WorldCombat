/** Compare current stage advantages; opt-in support shares the caster's advantage with an ally. */
namespace PokemonSkills {
    // 只读事实保留原入口；AI 决策改为按实际用法加权，见 powerswapBenefit。
    CompanionBehavior.registerFact("world_combat:powerswap-offence", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.powerswapOffence(access, actor);
    });

    /** 一个战斗者实际会用到的攻/特攻权重：最近真实出手偏向哪一边，那一项等级就值钱。 */
    function powerswapUsage(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): { atk: number; spa: number } {
        const access = CompanionBehavior.world(context), actor = access.actor(subject.ref);
        const recent = actor ? DamageSemantics.recentAttack(access, actor, 200) : null;
        if (recent && recent.category === "physical") return { atk: 1, spa: 0.25 };
        if (recent && recent.category === "special") return { atk: 0.25, spa: 1 };
        const stats = CompanionBehavior.combatStats(context, subject);
        const atk = stats && stats.stats ? Math.max(0, Number(stats.stats.atk) || 0) : 0;
        const spa = stats && stats.stats ? Math.max(0, Number(stats.stats.spa) || 0) : 0;
        return atk + spa > 0 ? { atk: atk / (atk + spa), spa: spa / (atk + spa) } : { atk: 0.5, spa: 0.5 };
    }
    /** 按接收方的实际用法给 received - given 的两围等级差定价；单独相加会把用不上的一项算成收益。 */
    function powerswapGain(context: WorldBehavior.Context, receiver: CompanionBehavior.Entity, giver: CompanionBehavior.Entity,
        weights: { atk: number; spa: number }): number {
        return (CompanionBehavior.stage(context, receiver, "atk") - CompanionBehavior.stage(context, giver, "atk")) * weights.atk
            + (CompanionBehavior.stage(context, receiver, "spa") - CompanionBehavior.stage(context, giver, "spa")) * weights.spa;
    }
    function powerswapBenefit(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        return target.friendly
            ? powerswapGain(context, self, target, powerswapUsage(context, target))
            : powerswapGain(context, target, self, powerswapUsage(context, self));
    }

    function powerswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "powerswap") || CompanionBehavior.status(context, target, "powerswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const margin = CompanionBehavior.ai<number>(item, "margin", 1);
        return target.friendly
            ? CompanionBehavior.ai<boolean>(item, "share", false) && powerswapBenefit(context, self, target) >= margin
            : powerswapBenefit(context, self, target) >= margin;
    }

    /** 侧移候选要看身体空间与支撑，而不是只看通向目标的直线。 */
    function powerswapApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const here = CompanionBehavior.point(self.point), there = CompanionBehavior.point(target.point);
        if (access.clear(here, there)) return null;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / length, pz = dx / length;
        const options = [[self.point[0] + px * 3, self.point[1], self.point[2] + pz * 3],
            [self.point[0] - px * 3, self.point[1], self.point[2] - pz * 3]];
        const width = Math.max(0.1, Number(self.width) || 0.9), height = Math.max(0.1, Number(self.height) || 1.4);
        for (let i = 0; i < options.length; i++) {
            const candidate = CompanionBehavior.point(options[i]);
            const support = WorldGeometry.ground(access, candidate, 3);
            if (Math.abs(support.y() - candidate.y()) > 1.5) continue;      // 悬空或没有落脚支撑
            if (!access.freeSpace(support, width, height)) continue;         // 放不下整个身体
            if (access.clear(support, there)) return [support.x(), support.y(), support.z()];
        }
        return null;
    }

    CompanionBehavior.registerUse("powerswap", {
        protocols: ["world_combat:attack", "world_combat:support"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || powerswapWants(context, item, target); },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !powerswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const gain = powerswapBenefit(context, self, target);
            return Math.max(1, Math.min(100, Math.round(45 + gain * 8)));
        },
        approach: function (context, _item, target) { return powerswapApproach(context, target); }
    });

    const powerswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    powerswapChase.help = "伙伴只在威胁离自己这么远以内时才换势；调小只在贴身时换，调大愿意追出去把气势接走。";
    const powerswapMargin = number("ai.margin", "换势下限", 0, 6, 1);
    powerswapMargin.help = "按双方实际会用到的攻/特攻折算后，对方那一边要比自己高出这么多级才出手；调大更挑剔，只在对方强化成型时换，调小更常出手。";
    const powerswapStation = flag("ai.leaveStation", "驻守时允许离位");
    powerswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换势。";

    addPreferences("powerswap", { ai: { maxChase: 12, margin: 1, leaveStation: false, share: false } },
        [powerswapChase, powerswapMargin, powerswapStation, flag("ai.share", "向伙伴分享")]);
}
