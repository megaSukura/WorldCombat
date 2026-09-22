/**
 * 大闹一番 的伙伴 AI 用途：一套「挤进人堆再原地乱挥」的出手计划。
 *
 * 什么局面有意义：威胁可见、敌对、存活，且在 ai.maxChase（默认 8）格以内，并且以自己为圆心、乱挥半径内
 *   至少站着 ai.minFoes（默认 1）个非友方。人不够就先由共享接近逻辑继续往里挤，不空放。
 * 对谁出手：当前威胁；正处于恍惚（共享身份 confusion）时不出手——刚闹完的自己就是乱的。
 * 够不到怎么办：reach 就是乱挥半径，够不到就由共享任务走近；挤进人群就是这一招的准备。
 * 放完之后：圈里的人被震开，伙伴交回共享顺序再决定追击还是脱离。
 * ai.leaveStation：驻守/静止命令下是否愿意离位去闹。
 */
namespace CompanionBehavior {
    function thrashFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function thrashRadius(capability: WorldBehavior.Capability): number {
        return typeof capability.data.range === "number" && isFinite(capability.data.range) ? capability.data.range : 3.4;
    }

    function thrashWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
        if (CompanionBehavior.status(context, self, "confusion")) return false;
        return thrashFoes(context, self.point, thrashRadius(capability)) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
    }

    CompanionBehavior.registerUse(PokemonSkills.thrashId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return thrashRadius(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!thrashWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !thrashWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return Math.min(92, 34 + thrashFoes(context, self.point, thrashRadius(capability)) * 8);
        }
    });

    PokemonSkills.addPreferences(PokemonSkills.thrashId, {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wild"), "狂乱", "boolean", {
            help: "开启：罩得更宽、推得更狠、末挥更重，但每一挥都会磕伤自己、冷却更久、闹完晕得更久——被围住时用。关闭（乱打）：只震不伤己、收放更快，代价是范围与击退都收窄。"
        }),
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 14, 1),
        PokemonSkills.number("ai.minFoes", "罩住人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
