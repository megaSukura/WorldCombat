/**
 * 打雷 / thunder 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记从天而降的远程落雷，所以伙伴会尽量拉开距离锁定目标。`ai.preferWet`（默认开）让它优先劈
 * 湿身的目标（雷更容易感电）——代价是可能放过没湿的真正威胁；关闭则只认威胁本身。
 * 下雨时命中率由实现保证为必中，AI 不需要额外选项。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("thunder", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferWet", true) && target.wet) score += 18;
            // 雨天加成、头顶被探到遮蔽则降权：屋顶会把这记雷整段挡掉。
            const env = WorldEnvironment.read(CompanionBehavior.world(context), CompanionBehavior.point(target.point));
            if (env && typeof env.rain === "number" && env.rain > 0.2) score += 14;
            if (env && env.loaded === true && env.skyVisible === false) score -= 30;
            return score;
        },
        selectTarget: function (context, capability, proposed) {
            if (!CompanionBehavior.ai<boolean>(capability, "preferWet", true)) return proposed;
            const self = CompanionBehavior.source(context);
            let best = proposed, bestWet = proposed.wet ? 1 : 0;
            const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === self.ref) continue;
                if (CompanionBehavior.distance(self.point, other.point) > CompanionBehavior.ai<number>(capability, "maxChase", 16)) continue;
                const wet = other.wet ? 1 : 0;
                if (wet > bestWet) { best = other; bestWet = wet; }
            }
            return best;
        }
    });

    addPreferences("thunder", {}, [
        field(pathOf("charged"), "聚云式", "boolean", {
            help: "开启：多蓄 6 刻，落雷威力更高、落点更集中（散布更小），但收招与冷却更长。关闭：雷落得更快，代价是威力略低、散布略大。"
        }),
        field(pathOf("ai.maxChase"), "施放距离", "number", {
            min: 2, max: 24, step: 1,
            help: "超过这个距离就不劈，先走近。越大越会在远处先手落雷。"
        }),
        field(pathOf("ai.preferWet"), "优先湿身目标", "boolean", {
            help: "开启：优先劈湿身的目标，雷更容易把它感电，但可能放过没湿的真正威胁。关闭：只认威胁本身。"
        })
    ]);
}
