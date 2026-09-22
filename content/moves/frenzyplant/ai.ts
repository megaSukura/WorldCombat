/**
 * 疯狂植物的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、活着且在施放距离以内，落点附近挤着至少 `ai.minTargets` 个可见敌人
 * （默认 1）；因为根须褪去后要力竭一段，自身生命要高于 `ai.minHealth`（或这一圈能罩住三个以上）才出手。
 * 对谁出手：在候选里挑「周围敌人最密」的那个当落点（selectTarget），一圈抽到更多人。
 * 怎么够到：共享接近把身位收到射程以内（`kind: "point"`，以目标位置为落点）。
 * 出手前后：放完交回共享交战计划；力竭期间招式由共享起手门禁自动屏蔽。
 */
namespace PokemonSkills {
    /** 以 target 为落点、半径约 3 格内当前可见敌人的数量；用于聚堆判断与排序。 */
    function frenzyplantCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("frenzyplant", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            if (proposed.friendly || !(proposed.health > 0) || !proposed.visible) return proposed;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let best = proposed, bestScore = frenzyplantCluster(context, capability, proposed);
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || !(other.health > 0) || !other.visible) continue;
                if (CompanionBehavior.distance(CompanionBehavior.source(context).point, other.point) > capability.data.range) continue;
                const score = frenzyplantCluster(context, capability, other);
                if (score > bestScore) { best = other; bestScore = score; }
            }
            return best;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return false;
            const cluster = frenzyplantCluster(context, capability, target);
            if (cluster < CompanionBehavior.ai<number>(capability, "minTargets", 1)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(self) >= minHealth || cluster >= 3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const cluster = frenzyplantCluster(context, capability, target);
            return cluster >= 3 ? 48 : cluster >= 2 ? 26 : 12;
        }
    });

    addPreferences("frenzyplant", {}, [
        field(pathOf("grip"), "缠根", "boolean", {
            help: "开启：根须铺得更开（半径 ×1.25），命中的目标被按在原地无法移动一段时间，但单伤下降、力竭更久；关闭：根须收得更紧、单伤更高、恢复更快，但不缠人。"
        }),
        field(pathOf("ai.minTargets"), "最少目标数", "number", {
            min: 1, max: 4, step: 1,
            help: "落点附近至少有几个敌人才主动施放。调高更惜用、专等对手聚堆，调成 1 则对单个目标也放。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动施放（除非能一次罩住三个以上目标）。越高越怕留下力竭空挡。"
        })
    ]);
}
