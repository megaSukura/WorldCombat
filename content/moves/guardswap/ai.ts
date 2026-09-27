/** Compare current defensive advantages; opt-in support shares the caster's guard with an ally. */
namespace PokemonSkills {
    // 只读事实保留原入口；AI 决策改为按实际来袭加权，见 guardswapBenefit。
    CompanionBehavior.registerFact("world_combat:guardswap-guard", function (access: CombatWorld, actor: CombatActor): number {
        return PokemonSkills.guardswapGuard(access, actor);
    });

    /** 一个战斗者实际会挨到的攻/特攻权重：最近真正打到它的人偏哪边，那一项守势就更值钱。 */
    function guardswapExposure(context: WorldBehavior.Context, subject: CompanionBehavior.Entity): { def: number; spd: number } {
        const access = CompanionBehavior.world(context);
        const attacker = subject.lastAttacker ? access.actor(subject.lastAttacker) : null;
        const recent = attacker ? DamageSemantics.recentAttack(access, attacker, 200) : null;
        if (recent && String(recent.target) === subject.ref) {
            if (recent.category === "physical") return { def: 1, spd: 0.3 };
            if (recent.category === "special") return { def: 0.3, spd: 1 };
        }
        return { def: 0.5, spd: 0.5 };
    }
    /** 按接收方的实际来袭给 received - given 的两围等级差定价；单独相加会把用不上的一项算成收益。 */
    function guardswapGain(context: WorldBehavior.Context, receiver: CompanionBehavior.Entity, giver: CompanionBehavior.Entity,
        weights: { def: number; spd: number }): number {
        return (CompanionBehavior.stage(context, receiver, "def") - CompanionBehavior.stage(context, giver, "def")) * weights.def
            + (CompanionBehavior.stage(context, receiver, "spd") - CompanionBehavior.stage(context, giver, "spd")) * weights.spd;
    }
    function guardswapBenefit(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        return target.friendly
            ? guardswapGain(context, self, target, guardswapExposure(context, target))
            : guardswapGain(context, target, self, guardswapExposure(context, self));
    }

    function guardswapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "guardswap") || CompanionBehavior.status(context, target, "guardswap")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const margin = CompanionBehavior.ai<number>(item, "margin", 1);
        return target.friendly
            ? CompanionBehavior.ai<boolean>(item, "share", false) && guardswapBenefit(context, self, target) >= margin
            : guardswapBenefit(context, self, target) >= margin;
    }

    /** 侧移候选要看身体空间与支撑，而不是只看通向目标的直线。 */
    function guardswapApproach(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number[] | null {
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

    CompanionBehavior.registerUse("guardswap", {
        protocols: ["world_combat:attack", "world_combat:support"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || guardswapWants(context, item, target); },
        accepts: function (_context, _item, target) { return target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !guardswapWants(context, item, target)) return 0;
            const self = CompanionBehavior.source(context);
            const gain = guardswapBenefit(context, self, target);
            return Math.max(1, Math.min(100, Math.round(45 + gain * 8)));
        },
        approach: function (context, _item, target) { return guardswapApproach(context, target); }
    });

    const guardswapChase = number("ai.maxChase", "考虑距离", 3, 24, 1);
    guardswapChase.help = "伙伴只在威胁离自己这么远以内时才换守；调小只在贴身时换，调大愿意追出去把防线接走。";
    const guardswapMargin = number("ai.margin", "换守下限", 0, 6, 1);
    guardswapMargin.help = "按双方实际会挨到的物理/特殊折算后，对方那一边要比自己高出这么多级才出手；调大更挑剔，调小更常出手。";
    const guardswapStation = flag("ai.leaveStation", "驻守时允许离位");
    guardswapStation.help = "开启后，收到「驻守」指令时也会离开原位去换守卫。";

    addPreferences("guardswap", { ai: { maxChase: 12, margin: 1, leaveStation: false, share: false } },
        [guardswapChase, guardswapMargin, guardswapStation, flag("ai.share", "向伙伴分享")]);
}
