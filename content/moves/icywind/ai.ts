/**
 * 冰冻之风 / icywind 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记向前推的走廊扫场。`available` 要求目标可见、敌对、存活，且落在 `ai.maxChase`
 * （默认 10）格内。对手跑得越快，冻这一下越值；`ai.cluster` 打开时，目标身边 3 格内还挤着别的敌人就抬高
 * priority，因为走廊会一次罩住一串。够不到交给共享接近逻辑；走进射程内就原地吐出。
 * 对谁出手：当前威胁；越靠近、越快的越优先。
 * 放完之后：被冻的目标速度下降，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    function icywindWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function icywindCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("icywind", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icywindWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !icywindWants(context, capability, target)) return 0;
            let base = 18;
            const speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
            if (speed > 0.08) base += Math.min(18, Math.round(speed * 60));
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return icywindCluster(context, target) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("icywind", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 18, step: 1,
            help: "威胁离自己这么远以内才考虑冰冻之风；调小只在近身吐气，调大愿意从更远处先手冻住。"
        }),
        field(pathOf("ai.cluster"), "成串时优先", "boolean", {
            help: "开启后，目标身边 3 格内还站着别的敌人时优先吐出，一条走廊一次冻住一串；关闭则只按普通攻击排序。"
        })
    ]);
}
