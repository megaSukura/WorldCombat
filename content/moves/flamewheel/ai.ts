/**
 * 火焰轮 / flamewheel 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内。它没有反伤，是最便宜的一滚，
 * 所以门槛低——只要有目标就愿意滚。
 * 对谁出手：`ai.preferIgnite`（默认开）时，还没被点着的目标排前面；`ai.preferCrowd`（默认开）时，
 * 目标身边挤着越多敌人越优先——火轮会碾过挡在路上的一串人，朝人堆滚比朝落单的人滚更值。
 * 自身被冻住时明确提权：滚动是直接位移，不受冰冻的速度压制，正好借这团火把自己化开。
 * 够不到怎么办：先按共享接近逻辑走近到 reach 之内。
 * 放完之后：一路滚过去，接着按共享交战计划继续追击或收势。
 */
namespace PokemonSkills {
    function flamewheelValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标身边挤着的其他敌人数量：火轮朝人堆滚才碾得到一串人。 */
    function flamewheelCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[] || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other || other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            if (CompanionBehavior.distance(target.point, other.point) <= 2.6) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("flamewheel", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!flamewheelValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) { return flamewheelValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const range = capability.data.range;
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return 0;
            let score = 22;
            if (CompanionBehavior.status(context, self, "frozen")) score += 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferIgnite", true) && !CompanionBehavior.status(context, target, "burn")) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) score += Math.min(18, flamewheelCrowd(context, target) * 8);
            if (distance <= range) score += 4;
            return score;
        }
    });

    addPreferences("flamewheel", {}, [
        field(pathOf("fierce"), "烈焰轮", "boolean", {
            help: "开启：灼伤概率与时长显著提高、火星更多、滚得更慢更短——把滚动换成持续点燃。关闭（疾风轮）：威力、滚动距离与滚动速度更高、节奏更快，但几乎不点着对手，更适合滚过一串人清场。"
        }),
        field(pathOf("ai.maxChase"), "滚动距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动起滚，先靠近。射程本就不长，设大也常常轮不到。"
        }),
        field(pathOf("ai.preferIgnite"), "优先点燃未着火目标", "boolean", {
            help: "开启：还没被点着的目标排前面，把火轮的作用铺开；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.preferCrowd"), "优先朝人堆滚", "boolean", {
            help: "开启：目标身边挤着越多敌人越优先——火轮会碾过挡在路上的一串人；关闭则只盯着单个目标。"
        })
    ]);
}
