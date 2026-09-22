/**
 * 泰山压顶 / bodyslam 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一次落点座压，所以 `ai.preferCrowd`（默认开）在目标身边还挤着别人时把它排到前面——
 * 代价是可能为了压人群而放过眼前真正的威胁；关闭则只按威胁本身选目标。
 * 体重大的伙伴更该用它（威力与压麻概率都随体重），这由公式承担，不需要额外选项。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("bodyslam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) {
                let crowd = 1;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 2.4) crowd++;
                }
                if (crowd >= 2) score += 20;
            }
            return score;
        }
    });

    addPreferences("bodyslam", {}, [
        field(pathOf("splash"), "震地式", "boolean", {
            help: "开启：落地范围更大、把周围敌人推得更开，但单点威力与压麻概率降低、收招与冷却更长。关闭：压顶式，落点更小、伤害与压麻概率更高。"
        }),
        field(pathOf("ai.maxChase"), "起跳距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不起跳，先走近。越大越会从远处扑下来，也越容易在起身期被闪开。"
        }),
        field(pathOf("ai.preferCrowd"), "优先压人群", "boolean", {
            help: "开启：目标周围挤着两个以上敌人时优先压顶（一发罩住多个）；关闭：只按威胁本身选目标。"
        })
    ]);
}
