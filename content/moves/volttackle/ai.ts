/**
 * 伏特攻击 / volttackle 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。它反噬重、蓄电久，所以门槛比轻招高：
 * 自身生命高于 `ai.minHealth`（默认 0.25），或对手已经残到值得一收时才排前面。
 * 对谁出手：`ai.preferCrowd`（默认开）时，目标身边 3 格内挤着越多敌人越优先——命中的电弧会把旁边的人一起电到；
 * 已经麻痹的目标排到最后（这一撞的价值在灌入麻痹与波及）。
 * 够不到怎么办：先按共享接近逻辑蓄势走近；蓄电期可以被打断，所以别在火力覆盖下起手。
 * 放完之后：目标被顶飞了，接着按共享交战计划追击或拉开。
 */
namespace PokemonSkills {
    function volttackleValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标身边 3 格内的其他敌人数量：放电半径内的旁人也吃电弧。 */
    function volttackleCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[] || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other || other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            if (CompanionBehavior.distance(target.point, other.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("volttackle", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!volttackleValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.25);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth
                || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) { return volttackleValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) score += Math.min(20, volttackleCrowd(context, target) * 9);
            if (!CompanionBehavior.status(context, target, "paralysis")) score += 10;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            return score;
        }
    });

    addPreferences("volttackle", {}, [
        field(pathOf("discharge"), "泄放式", "boolean", {
            help: "开启：放电半径与波及威力更高、反噬更重、冲程更短，单体略轻——把电荷摊开电一群人。关闭（聚敛式）：单体威力更高、反噬更轻、冲程更长，放电半径与波及威力收小——把电全部灌进一个目标。"
        }),
        field(pathOf("ai.maxChase"), "爆冲距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动蓄电起冲，先靠近。越大越早蓄势，也越容易在蓄电期被打断或冲空。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动蓄电（除非对手已残）。这一招反噬重，调高更珍惜自己。"
        }),
        field(pathOf("ai.preferCrowd"), "优先朝人堆冲", "boolean", {
            help: "开启：目标身边挤着越多敌人越优先——命中的电弧会把旁边的人也电到；关闭则只盯着单个目标。"
        })
    ]);
}
