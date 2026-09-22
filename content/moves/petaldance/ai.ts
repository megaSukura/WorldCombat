/**
 * 花瓣舞 的伙伴 AI 用途：一套「在外围旋舞、削一圈」的出手计划。
 *
 * 什么局面有意义：威胁可见、敌对、存活，且在 ai.maxChase（默认 12）格以内（花瓣舞够得远，比近战敢早开），
 *   并且以自己为圆心、风暴半径内至少站着 ai.minFoes（默认 1）个非友方。人不够就先由共享接近逻辑继续靠近。
 * 对谁出手：当前威胁；正处于恍惚（共享身份 confusion）时不出手——刚跳完的自己就是乱的。
 * 够不到怎么办：reach 就是风暴半径，够不到就由共享任务走近。
 * 放完之后：圈里的人被花瓣推挤，伙伴交回共享顺序再决定追击还是拉开距离。
 * ai.leaveStation：驻守/静止命令下是否愿意离位去舞。
 */
namespace CompanionBehavior {
    function petalRadius(capability: WorldBehavior.Capability): number {
        return typeof capability.data.range === "number" && isFinite(capability.data.range) ? capability.data.range : 5.0;
    }

    function petalFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.visible || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function petalWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
        if (CompanionBehavior.status(context, self, "confusion")) return false;
        return petalFoes(context, self.point, petalRadius(capability)) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
    }

    CompanionBehavior.registerUse(PokemonSkills.petaldanceId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return petalRadius(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!petalWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !petalWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return Math.min(88, 30 + petalFoes(context, self.point, petalRadius(capability)) * 8);
        }
    });

    PokemonSkills.addPreferences(PokemonSkills.petaldanceId, {}, [
        PokemonSkills.field(PokemonSkills.pathOf("drift"), "旋舞", "boolean", {
            help: "开启：漂得更远、风暴更宽、花瓣留得更久、推得更开，但起手与冷却更久、舞完晕得更久——适合边打边拉开距离。关闭（原地舞）：转在原地、收放更快、失控更短，代价是范围与留痕都收窄。"
        }),
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "罩住人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
