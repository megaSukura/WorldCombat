/**
 * 硬压 / hardpress 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记「压完整度」的开场攻击：威力随**目标剩余生命比例**走高，所以 `ai.preferHealthy`（默认开）会把血量更满的
 *   目标排到前面；反过来，目标已经残了就把评分压下去，让别的补刀招先上——这一记留给孩子还满着血的对手。
 * 对谁出手：单体；`brace`（双腕式）开启时，目标周围挨着站的敌人越多越值得用（一次掌面罩住一片），
 *   代价是单点更轻，起手与冷却不变。两者都是玩家能预见的取舍。
 * 放完之后：冷却短、起手快，可以一记接一记地压；AI 会按同一套判断继续压下去。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(hardpressId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const ratio = CompanionBehavior.ratio(target);
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferHealthy", true)) {
                score += Math.round(ratio * 30);
                // 已经残了的目标不值得再压一下，把机会让给补刀招。
                if (ratio < 0.33) score -= 18;
            }
            if (capability.data.config && capability.data.config.brace) {
                let crowd = 0;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 1.9) crowd++;
                }
                if (crowd >= 2) score += 16;
            }
            return score;
        }
    });

    addPreferences(hardpressId, {}, [
        field(pathOf("brace"), "双腕式", "boolean", {
            help: "开启：两腕／双钳一起压下去，掌面半宽 ×1.7，可一次罩住并排站的几个目标，但单点威力 ×0.86，起手与冷却不变。关闭：单腕式，单点更重、掌面更窄。"
        }),
        field(pathOf("ai.maxChase"), "下压距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标超过这个距离就先走近再压。越大越会从远处出手，也越容易在抬手时被走开。"
        }),
        field(pathOf("ai.preferHealthy"), "先压完好的目标", "boolean", {
            help: "开启：按目标的剩余生命比例排序，血量越满越优先（这一下对它最重），残血目标则降权让位给补刀；关闭：只按威胁本身选目标。"
        })
    ]);
}
