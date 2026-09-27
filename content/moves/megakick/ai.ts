/**
 * 百万吨重踢 / megakick 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内。这一招起手长、冷却久、PP 只有 5，
 * 所以要求自身生命高于 `ai.minHealth`，或对手已经残到值得一收。踢飞的一脚也用来把目标踢出阵型、逼它离开站位。
 * 对谁出手：当前近身威胁；不可见、友方、已倒下的不接受。
 * 够不到怎么办：距离交给 `reach`，共享任务贴身；这一招的射程就是那次突进，不负责远程。
 * 目标在横移、或自身到目标被墙挡住时这一脚容易落空，起手长、后摇也长，所以这类目标降低出手倾向。
 * 放完接什么：交回共享交战计划；`ai.finish` 开启时残血目标排得更前。
 */
namespace PokemonSkills {
    function megakickValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse("megakick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!megakickValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.3);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth
                || CompanionBehavior.ratio(target) <= 0.35;
        },
        accepts: function (context, capability, target) { return megakickValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) score += 26;
            if (target.grounded === false) score -= 12;
            // 目标横移判断：沿踢路横向速度越大，这记高后摇的重踢越容易落空，降低倾向。
            if (target.velocity && target.velocity.length === 3 && gap > 0.5) {
                const ux = (target.point[0] - self.point[0]) / gap, uz = (target.point[2] - self.point[2]) / gap;
                const lateral = Math.abs(target.velocity[0] * uz - target.velocity[2] * ux);
                if (lateral > 0.08) score -= 14;
            }
            // 实际踢路判断：自身到目标若被墙挡住，这一脚会先撞墙，降低倾向。
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) score -= 8;
            return score;
        }
    });

    addPreferences("megakick", {}, [
        field(pathOf("launch"), "踢飞式", "boolean", {
            help: "开启：把目标抛得更远更高，收招与冷却更久、单发威力略低——适合把目标踢出阵型。关闭（砸穿式）：一记更重、更省时、几乎不抛飞但冲击更实的重踢。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起重踢，先靠近。这一招起手很长，调大更容易在突进路上被让开。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动重踢（除非对手已残）。越高越珍惜自己。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一脚；关闭：只按普通近身候选参与排序。"
        })
    ]);
}
