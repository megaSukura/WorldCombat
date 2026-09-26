/**
 * 臂锤 / hammerarm 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记自由瞄准的近身短拳路过顶重砸。目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；
 *   更远交给共享接近逻辑。这一记会让自身速度下降，所以只在够得到时用，不拿它去追人。
 * 对谁出手：`ai.finish`（默认开）打开时，残血目标多一档分——用一记最重的原地打击收掉。
 *   自身当前速度已经很低（`spe` 到 −3 以下）时再压低分：这份代价已经不值得继续叠加。
 * 够不到怎么办：reach 就是本招射程，不够先走近；目标在起手期间跑掉、或拳路先碰上墙，就只留扑空的尘。
 * 放完之后：命中且真的降速后才付自身速度；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function hammerarmWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("hammerarm", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hammerarmWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !hammerarmWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.45) score += 12;
            if (CompanionBehavior.stage(context, self, "spe") <= -3) score -= 12;
            return score;
        }
    });

    addPreferences("hammerarm", {}, [
        field(pathOf("followthrough"), "顺势式", "boolean", {
            help: "开启：砸退 ×1.35、裂痕更大更密，把目标砸出阵地；代价是威力 ×0.9、起手 +2 刻、收招 +3 刻、冷却 +6 刻。关闭（屏息式）：接触前收住力，单发更重、出手更快，但砸退与裂地都小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动发起臂锤，先走近。调大愿意从稍远处上前砸，也越容易在起手期间被走位甩开。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记最重的原地打击收掉；关闭则所有目标同价。"
        })
    ]);
}
