/**
 * 爆音波 / boomburst 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、空中地面都轰的一次性声压爆。`ready` 要求身周 `ai.maxChase`（默认 9）格内
 * 至少站着 `ai.minFoes`（默认 2）个可见、敌对的敌人——它起手长、威力高，是用来一次轰开一圈的，
 * 只对一个目标放不划算。`available` 还要求目标在考虑距离内；它不挑目标站不站在地上。
 * 另外：自己血量低于一半时 priority 抬高一段——被压着打时，把贴身的人一次吹开比继续硬拼更值。
 * 够不到交给共享接近逻辑；走到波及半径以内就原地炸。
 */
namespace PokemonSkills {
    function boomburstCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 9);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function boomburstWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("boomburst", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && boomburstCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return boomburstWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !boomburstWants(context, capability, target)) return 0;
            let base = 20;
            const count = boomburstCount(context, capability);
            if (count >= 3) base += Math.min(26, (count - 2) * 8);
            // 被压着打时，把贴身的人一次吹开比继续硬拼更值。
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences("boomburst", {}, [
        field(pathOf("concussive"), "爆压式", "boolean", {
            help: "开启：声压收到约 0.72 倍、爆发约 ×1.3、击飞约 ×1.35，起手 +3 刻、冷却 +8 刻，把一圈人轰得更远、用来啃单个硬目标。关闭（扩散式）：范围约 ×1.12、威力与击飞较小、出手更快，用来一次扫到更多人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑爆音波；调小只在贴身炸，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "轰到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "波及圈内至少站着这么多可见、敌对的敌人才炸；调大只被围住时用，调 1 见一个也炸。"
        })
    ]);
}
