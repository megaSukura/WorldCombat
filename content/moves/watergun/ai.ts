/**
 * 水枪 / watergun 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远交给共享接近逻辑。
 *   它起手短、冷却短、可以边走边喷，所以在贴身缠斗与追击里也照常出手，不像重招那样要站定。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分——用最便宜的一发去收尾，把 PP 留给重招；
 *   关闭则所有目标同价，只按普通远程攻击排序。
 * 够不到怎么办：reach 就是本招射程，不够先走近；因为可以在移动中出手，接近途中也能补枪。
 * 放完之后：这一发很短，交回共享交战计划，冷却一好就能再喷。
 */
namespace PokemonSkills {
    function watergunWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    CompanionBehavior.registerUse("watergun", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return watergunWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !watergunWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 16;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.4) score += 10;
            return score;
        }
    });

    addPreferences("watergun", {}, [
        field(pathOf("charge"), "蓄压式", "boolean", {
            help: "开启：水线威力 ×1.28、判定 ×1.25，适合点掉低防目标；代价是喷射速度 ×0.85、射程 −2 格、起手 +4 刻、冷却 +8 刻，变得更慢更近。关闭（疾喷式）：喷射更快、射程 +2 格、起手与冷却更短，代价是单发威力只有蓄压式的约八成。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动喷水线，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这记最便宜的水线收尾，把 PP 留给重招；关闭则所有目标同价。"
        })
    ]);
}
