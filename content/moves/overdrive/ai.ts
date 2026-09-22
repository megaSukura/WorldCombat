/**
 * 破音 / overdrive 的伙伴 AI 用途。
 *
 * 什么局面下出手：朝正前方一条走廊的连续三段电声乐句，每一段都可能把目标震到麻痹。`ready` 要求
 *   考虑距离 `ai.maxChase`（默认 10）内有至少 `ai.minFoes`（默认 1）个可见、敌对的敌人——
 *   它单体也够看（多段 + 概率麻痹），所以见一个也能拨。`available` 另外要求目标在考虑距离内。
 * 站位：共享接近逻辑把身位收到走廊长度以内，然后朝目标方向连拨三下。
 * 另外：目标已经麻痹或血量见底时 priority 略降——状态已经兑现在别处；被多个目标排成一列时抬一段。
 * 放完之后：交给共享顺序继续交战；冷却没转好前不重复。
 * 配置：`ai.maxChase` 限制考虑距离；`ai.minFoes` 决定要几个目标才值得起三段。
 */
namespace PokemonSkills {
    function overdriveCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 10);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function overdriveWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    CompanionBehavior.registerUse("overdrive", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && overdriveCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return overdriveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !overdriveWants(context, capability, target)) return 0;
            let base = 24;
            const count = overdriveCount(context, capability);
            if (count >= 3) base += Math.min(18, (count - 2) * 6);
            // 目标已经麻痹时，状态已经兑现，少花一次三段。
            if (CompanionBehavior.status(context, target, "paralysis")) base -= 10;
            return base;
        }
    });

    addPreferences("overdrive", {}, [
        field(pathOf("echo"), "余响", "boolean", {
            help: "开启：三下之后隔一段再来一记更重的迟到声浪（每下威力约 ×0.82、总量摊到更多下），多一次麻痹机会、冷却 +8 刻，用来赌状态或啃硬目标。关闭：三下紧凑收束、出手更快，用来快进快出。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑破音；调小只在贴身时拨，调大愿意先追进去再拨。"
        }),
        field(pathOf("ai.minFoes"), "走廊人数", "number", {
            min: 1, max: 6, step: 1,
            help: "走廊方向上至少站着这么多可见、敌对的敌人才出手；调大只在人排成列时拨、省 PP，调 1 见一个也拨。"
        })
    ]);
}
