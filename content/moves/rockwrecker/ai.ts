/**
 * 岩石炮的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、活着，距离在 `ai.minRange` 与投送距离之间——巨石走抛物线，
 * 贴脸时反而难砸准，所以太近不出手；因为落地后要力竭一段，自身生命要高于 `ai.minHealth`（或目标已残）才出手。
 * 对谁出手：候选按距离排序，中远距离（≥5 格）更优先；落点周围挤着更多敌人时再加权——矮掩体后的一堆目标最划算。
 * 怎么够到：共享接近把身位收进投送距离，再朝目标抛出巨石（`kind: "point"`，落点由弹道决定）。
 * 出手前后：放完交回共享交战计划；力竭期间招式由共享起手门禁自动屏蔽。
 */
namespace PokemonSkills {
    /** 以 target 落点为中心、附近还挤着多少可打的敌人；用于「矮掩体后聚集」的优先级。 */
    function rockwreckerCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= 2.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("rockwrecker", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return false;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 3)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(self) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = distance >= 5 ? 32 : 24;
            score += Math.min(3, rockwreckerCluster(context, target)) * 6;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 14;
            return score;
        }
    });

    addPreferences("rockwrecker", {}, [
        field(pathOf("crush"), "碾碎", "boolean", {
            help: "开启：扛起更重的整块巨石——单伤更高、砸得更开、顶得更远，但飞得更慢更容易被躲，力竭也更久；关闭：换成更轻的一块，飞得快、恢复快、碎裂范围更小。"
        }),
        field(pathOf("ai.minRange"), "最近距离", "number", {
            min: 0, max: 8, step: 1,
            help: "比这更近就不抛石——巨石走弧线，贴脸难砸准。调高让伙伴只在拉开身位时用岩石炮，调到 0 则贴身也抛。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动抛石（除非目标已残）。越高越怕留下力竭空挡。"
        })
    ]);
}
