/**
 * 放电 / discharge 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、空中地面都打的无差别扫场。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；`ai.cluster` 打开时，目标身边 3.5 格内还挤着人就抬高 priority。
 * 目标还没被麻住时略优先（先麻一排最值）。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function dischargeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    function dischargeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
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
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return dischargeCluster(context, target) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("discharge", {}, [
        field(pathOf("overcharge"), "过载式", "boolean", {
            help: "开启：电环收窄、每发更重、麻痹几率更高，但不再有余电，起手与冷却更长，用来电穿单个硬目标。关闭：电环更广、附带一次余电，适合一次点着一群人。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动放电，先朝目标走近。越大越愿意先接近再电。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先放电，一次电到一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
