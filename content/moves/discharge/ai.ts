/**
 * 放电 / discharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、空中地面都打的一次性扫场。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；`ai.cluster` 打开时按**自身体周**的近敌数抬高 priority
 * ——自己身边挤着人时一次电到一圈最值。目标还没被麻住时略优先。
 * 由于只有一次结算，AI 无需押在第二扫仍留场：过载式偏向少数耐打目标，广域式偏向成片的近敌。
 */
namespace PokemonSkills {
    function dischargeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    /** 自身体周 `range` 格内的敌人数；围住自己的越多，一次放电越值。 */
    function dischargeRing(context: WorldBehavior.Context, range: number): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 0, self = CompanionBehavior.source(context).point;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self) <= range) count++;
        }
        return count;
    }

    /** 耐打目标：已知最大生命时按剩余七成以上判断；不知道最大生命则不算重目标。 */
    function dischargeHeavy(target: CompanionBehavior.Entity): boolean {
        return typeof target.maximum === "number" && target.maximum > 0 && target.health >= target.maximum * 0.7;
    }

    CompanionBehavior.registerUse("discharge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dischargeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !dischargeWants(context, capability, target)) return 0;
            var base = 18;
            if (!CompanionBehavior.status(context, target, "paralysis")) base += 8;
            if (CompanionBehavior.ai<boolean>(capability, "overcharge", false)) return dischargeHeavy(target) ? base + 8 : base;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return dischargeRing(context, capability.data.range) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("discharge", {}, [
        field(pathOf("overcharge"), "过载式", "boolean", {
            help: "开启：电环收窄、每发更重、麻痹几率更高，最多打 3 个目标，起手与冷却更长，用来电穿单个硬目标。关闭：电环更广、最多打 8 个目标。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动放电，先朝目标走近。越大越愿意先接近再电。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，自身体周本次射程内围着 2 个以上敌人时优先放电，一次电到一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
