/**
 * 水蒸气 / hydrosteam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * 对谁出手：一条向前张开的扇面，目标越靠近正前方越值。晴天（`context.facts.sunlight` ≥ 0.85）时它是强化水输出，
 *   优先级最高；普通天气则数一数目标方向前方的实际扇面里还挤着几个非友方（含目标），一次罩住多人时才抬价。
 *   自己身上带着冰冻时它同时是自救解冻手段，抬价。`ai.avoidFrozen`（默认开）打开时，冻住的目标排后——
 *   蒸汽会替它解冻，等于帮了它。够不到就靠近；放完之后交回共享交战计划。
 */
namespace CompanionBehavior {
    function hydrosteamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    /** 以目标方向为中线，数一数实际扇面里还挤着几个非友方（含目标），按本个体真实的 reach/angle 判定。 */
    function hydrosteamFanCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context).point;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const reach = Math.max(4, PokemonSkills.p(PokemonSkills.hydrosteamId, "reach", world));
        const angle = Math.max(20, Math.min(100, PokemonSkills.p(PokemonSkills.hydrosteamId, "angle", world)));
        const cosHalf = Math.cos(angle * Math.PI / 360);
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length;
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2], distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > reach || distance < 1e-6) continue;
            if ((ox / distance) * ux + (oz / distance) * uz >= cosHalf - 1e-12) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(PokemonSkills.hydrosteamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hydrosteamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !hydrosteamWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 15;
            const sun = typeof context.facts.sunlight === "number" ? context.facts.sunlight as number : 0;
            // 晴天：本身是强化水输出，单人目标也值得；普通天气：数扇内敌数，能一起罩住才抬价。
            if (sun >= 0.85) score += 14;
            else if (hydrosteamFanCount(context, capability, target) >= 2) score += 10;
            // 自己冻着时，这一喷先解自己的冻。
            if (CompanionBehavior.status(context, self, "frozen")) score += 16;
            if (CompanionBehavior.ai<boolean>(capability, "avoidFrozen", true) && CompanionBehavior.status(context, target, "frozen"))
                score -= 10;
            return score;
        }
    });

    const hydrosteamChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 22, 1);
    hydrosteamChase.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处先喷一记。";
    const hydrosteamAvoid = PokemonSkills.flag("ai.avoidFrozen", "避开冻住的目标");
    hydrosteamAvoid.help = "开启：冻住的目标排后，因为蒸汽会替它解冻（等于帮了它）；关闭则不看冰冻状态、按普通远程攻击排序。";

    PokemonSkills.addPreferences(PokemonSkills.hydrosteamId, { ai: { maxChase: 13, avoidFrozen: true } },
        [hydrosteamChase, hydrosteamAvoid]);
}
