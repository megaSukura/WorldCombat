/**
 * 重踏 / bulldoze 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、只打地面的近距扫场。`available` 要求有可见、敌对、存活、
 * **站在地上**且落在 `ai.maxChase`（默认 7）格内的目标；空中的对手不在这招的目标里。
 * 对手跑得越快，削这一脚速度越值；`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority。
 * 够不到交给共享接近逻辑；走到气场半径以内就原地踏下。
 */
namespace PokemonSkills {
    function bulldozeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    function bulldozeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || other.grounded === false) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("bulldoze", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bulldozeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !bulldozeWants(context, capability, target)) return 0;
            var base = 16;
            var speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
            if (speed > 0.1) base += Math.min(16, Math.round(speed * 50));
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return bulldozeCluster(context, target) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("bulldoze", {}, [
        field(pathOf("deep"), "深踏式", "boolean", {
            help: "开启：地裂收窄、单次更重、多降一级速度，起手与冷却更长，用来砸单个硬目标。关闭：震得更广、出手更快，适合一次扫一片、追跑得快的对手。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动踏入人堆，先朝目标走近。越大越愿意先接近再踏。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还站着别的敌人时优先重踏，一次震住一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
