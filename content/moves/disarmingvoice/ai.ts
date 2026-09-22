/**
 * 魅惑之声 / disarmingvoice 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；声场以自身为心，所以它先把身位收到声场半径内再唱。
 * `ai.group`（默认开）：目标身边还有别的敌人时抬高 priority，因为一句叫声能同时罩住一圈。
 * 安抚形态下更愿意在有第二个敌人或目标攻击高时唱，用降攻换取交换优势。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("disarmingvoice", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 20 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "group", true)) return base;
            var nearby = context.facts.nearby as CompanionBehavior.Entity[];
            for (var i = 0; i < nearby.length; i++) {
                var other = nearby[i];
                if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 4) return 36;
            }
            return base;
        }
    });

    addPreferences("disarmingvoice", {}, [
        field(pathOf("soothe"), "安抚", "boolean", {
            help: "开启：被罩住的目标额外降攻并带魅惑身份，但威力 ×0.85、起手多 3 刻、冷却多 6 刻。关闭：满威力的清唱，只让目标错拍、更快。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动唱，先走近。越大越会在更远处先声夺人。"
        }),
        field(pathOf("ai.group"), "成圈取材", "boolean", {
            help: "开启后，目标身边还有别的敌人时优先开口，让声场同时罩住一圈；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为罩住更多敌人离开站位；关闭则只在原地够得到时开口。"
        })
    ]);
}
