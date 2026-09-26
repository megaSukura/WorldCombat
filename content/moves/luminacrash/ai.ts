/**
 * 琉光冲激 / luminacrash —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 13）格内；这是中远程的一记引光。
 * 对谁出手：移动较慢但并非完全静止的目标最值（光柱落得准，旁伤也有机会卷到）；疾走者需要预测锁点、命中率低，降档。
 *   `ai.cluster`（默认开）打开时，目标身边还围着别的敌人再加一档——弥散/聚焦的炸落都能连周围一起砸；关闭则只按普通攻击排序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再引光；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；光柱坠落时会更新锚点，冻结前跑掉的目标会砸空。
 */
namespace PokemonSkills {
    function luminacrashCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const radius = typeof capability.data.range === "number" ? capability.data.range : 10;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            if (CompanionBehavior.distance(other.point, self) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("luminacrash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            let base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 24 : 0;
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
            if (speed > 0.12) base -= Math.min(16, speed * 100);
            else if (speed > 0.02) base += 6;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return luminacrashCluster(context, capability) >= 2 ? base + 12 : base;
        }
    });

    addPreferences("luminacrash", {}, [
        field(pathOf("disperse"), "弥散式", "boolean", {
            help: "开启：炸落半径 ×1.5、溅射 ×1.3，但光柱单发 ×0.85、起手 +2 刻、冷却 +5 刻，适合砸一群。关闭（聚焦式）：一道细光柱、单点更重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不引光，先走近；越大越愿意从远处先手。"
        }),
        field(pathOf("ai.cluster"), "聚堆时优先", "boolean", {
            help: "开启后，目标身边还有别的敌人时优先引光，落点连周围一起砸；关闭则只按普通攻击排序。"
        })
    ]);
}
