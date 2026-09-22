/**
 * 挖洞 / Dig — 伙伴 AI 用途。
 *
 * 破土是锁点的范围爆发，所以这招最怕目标在准备期走开。伙伴因此默认克制：`ai.opening` 设为「只砸
 * 停住的目标」时，它只在目标被定身、麻痹或没有在逃跑时下铲；「随时」则见到目标就挖。「crowd」
 * 让它留到目标身边聚着多个敌人时再挖，好一次掀飞更多；目标被定住且身边聚着人时，priority 会提到
 * 100，抢先破土。冲击痕会真的留在地表，所以伙伴也可能绕着新痕迹继续打。
 * reach 与射程一致；available 在规划阶段带候选目标做局面筛选、无目标时不隐藏整招，accepts 再按同一局面
 * （可见、活着、非友方、追击距离、crowd、opening）收起真正能落铲的目标。
 */
namespace CompanionBehavior {
    function digCrowd(context: WorldBehavior.Context, threat: Entity, radius: number): number {
        var nearby = context.facts.nearby as Entity[], count = 0;
        for (var i = 0; i < nearby.length; i++) {
            if (nearby[i].friendly || nearby[i].health <= 0) continue;
            if (distance(nearby[i].point, threat.point) <= radius) count++;
        }
        return count;
    }

    function digStill(context: WorldBehavior.Context, threat: Entity): boolean {
        if (protectedControl(threat)) return true;
        if (status(context, threat, "paralysis") || status(context, threat, "sleep") || status(context, threat, "frozen")) return true;
        return !fleeing(context, threat);
    }

    function digTrapped(context: WorldBehavior.Context, threat: Entity): boolean {
        return protectedControl(threat) || status(context, threat, "paralysis") || status(context, threat, "sleep") || status(context, threat, "frozen");
    }

    /** 这个目标此刻值不值得挖：看得见、活着、非友方、在追击距离内，并满足 crowd 与 opening。 */
    function digWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.friendly || !threat.visible || threat.health <= 0) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        var need = ai<number>(item, "crowd", 1);
        if (need > 1 && digCrowd(context, threat, 3.0) < need) return false;
        if (ai<string>(item, "opening", "anytime") !== "still") return true;
        return digStill(context, threat);
    }

    const digOpening = PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "still"], ["随时", "只砸停住的目标"]);
    digOpening.help = "「只砸停住的目标」会让伙伴把挖洞留到目标被定身、麻痹或没有逃跑时；追着跑动的目标挖容易落空。";
    const digCrowdSize = PokemonSkills.number("ai.crowd", "起挖所需敌人数", 1, 4, 1);
    digCrowdSize.help = "目标身边至少聚着这么多敌人时才挖，设为 1 则单个目标也挖。";
    const digChase = PokemonSkills.number("ai.maxChase", "追击距离", 4, 16, 1);
    digChase.help = "目标离自己这么远以内才考虑挖洞。";

    PokemonSkills.addPreferences("dig", { ai: { opening: "anytime", crowd: 1, maxChase: 12 } }, [digOpening, digCrowdSize, digChase]);
    registerUse("dig", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        // 规划阶段会带着候选目标调用一次；没有目标时不要把整招藏起来，交给 accepts 过滤。
        available: function (context, item, _purpose, target) {
            return !target || digWants(context, item, target);
        },
        priority: function (context, item, target) {
            // 目标已被定住、身边又聚着人时，这次破土能一次掀飞一群：紧急程度压过普通输出。
            if (!target || !digTrapped(context, target)) return 0;
            return digCrowd(context, target, 3.0) >= 2 ? 100 : 0;
        },
        accepts: function (context, item, target) {
            return digWants(context, item, target);
        }
    });
}
