/**
 * 终极冲击的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这是一记带真实力竭的全力冲撞，
 * 所以只在自身生命高于 `ai.minHealth`、或对手已经能用这一下收掉时才排到前面。
 * 贴身且在射程内时 priority 抬高；对手残血且已进入冲程时最优先。
 * 冲完自己会定在原地，所以身边还挤着多个近敌时明显降优先——那是挨打的窗口；
 * 有己方伙伴贴近掩护时再抬一点，敢在有后手时冲。力竭期间招式自动不可用（共享起手门禁）。
 */
namespace PokemonSkills {
    /** 施法者身周贴近的其他活体：敌人数（冲完被围的代价）与友方数（能掩护的后手）。 */
    function gigaimpactSurround(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): { crowd: number; cover: number } {
        var nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        var crowd = 0, cover = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || !(other.health > 0)) continue;
            var away = CompanionBehavior.distance(other.point, self.point);
            if (other.friendly) { if (away <= 6) cover++; }
            else if (String(other.ref) !== String(target.ref) && away <= 5) crowd++;
        }
        return { crowd: crowd, cover: cover };
    }

    CompanionBehavior.registerUse("gigaimpact", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            var minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.3);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || CompanionBehavior.ratio(target) <= 0.35;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var self = CompanionBehavior.source(context);
            var close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            var score = CompanionBehavior.ratio(target) <= 0.3 ? 74 : 22;
            var around = gigaimpactSurround(context, self, target);
            score -= Math.min(3, around.crowd) * 8;
            if (around.cover > 0) score += Math.min(2, around.cover) * 5;
            return Math.max(0, score);
        }
    });

    addPreferences("gigaimpact", {}, [
        field(pathOf("brace"), "收势", "boolean", {
            help: "开启：撞到前主动收力——力竭时间明显更短、击退更小，但冲程与冲击范围也缩水；关闭：把全身压进去，冲得更远、撞得更重、把目标顶得更开，代价是撞完后更长的无法行动。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动发起终极冲击，先走近。越大追击越执着，也越容易在开阔地空撞。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动冲撞（除非目标已残）。越高越珍惜自己，也越少抢收残血。"
        })
    ]);
}
