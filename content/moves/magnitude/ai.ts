/**
 * 震级 / magnitude 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、只颤地面的原地扫场。`ready` 要求身周 `ai.maxChase`（默认 7）格内
 *   至少有 `ai.minFoes`（默认 2）个可见、敌对、存活、**站在地上**的目标——它本来就是拿来震一圈的。
 *   空中的对手不在目标里，AI 不会为它转身。
 * 对谁出手：候选就是当前威胁，但 `accepts`/`available` 只接受站在地上的；飞行、漂浮中的目标跳过。
 * 够不到怎么办：交给共享接近逻辑；走进震幅以内就原地压地。
 * 放完接什么：交回共享交战计划；若掷出的震级够大，被打断的对手还在收势，是否追击由共享顺序决定。
 * 排序：目标每多一个 +7（上限 +28）；冷却短，是可以用它反复骚扰的近身扫场。
 */
namespace PokemonSkills {
    function magnitudeCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 7);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.grounded === false) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function magnitudeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible || target.grounded === false) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("magnitude", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && magnitudeCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return magnitudeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !magnitudeWants(context, capability, target)) return 0;
            let base = 16;
            const count = magnitudeCount(context, capability);
            if (count >= 3) base += Math.min(28, (count - 2) * 7);
            return base;
        }
    });

    addPreferences("magnitude", {}, [
        field(pathOf("fault"), "深源式", "boolean", {
            help: "开启（深源式）：掷出的震级整体 +1（下限抬高、期望更高）、震幅 ×1.15、打断阈值 −1，起手 +4 刻、冷却 +14——稳定高伤与可靠打断。关闭（浅源式）：震级 4..10 全范围都可能（可能很小）、震幅 ×0.9、起手与冷却更短——出手快、反复骚扰。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑震级；调小只在贴身震，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "震动人数", "number", {
            min: 1, max: 6, step: 1,
            help: "震幅圈内至少这么多可见、站在地上的敌人才震；调大只被围住时用，调 1 见一个也震。"
        })
    ]);
}
