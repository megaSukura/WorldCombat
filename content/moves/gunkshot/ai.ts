/**
 * 垃圾射击 / gunkshot —— 伙伴 AI 用途。
 *
 * 什么局面下出手：这一族唯一的物理重炮，挂在共享 attack／ranged 位上。目标可见、敌对、存活、在 `ai.maxChase`
 *   （默认 16）以内就考虑；炮弹带偏角，离得越远越容易打偏，所以中近距离（射程 60% 以内）会明显更愿意开炮。
 * 对谁出手：`ai.preferBig`（默认开）时，体型大的目标更好中、被顶得更远，priority 更高；横移快的目标更难被这条直线咬住，
 *   尤其远处降权，横移慢的更靠前——重装不强行补必中。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进炮程。
 * 放完之后：命中则重伤、顶开并按概率带毒，伙伴交回共享顺序；打偏只走冷却，不结算任何伤害。
 * 优先级：中近程 30（大体型 +10）／ 接近射程上限 18 ／ 还需先走近 6；低横移 +6，远距离高速横移 −6。
 */
namespace PokemonSkills {
    function gunkshotSize(target: CompanionBehavior.Entity): number {
        var width = typeof target.width === "number" ? target.width : 0.9;
        var height = typeof target.height === "number" ? target.height : 1.4;
        return width * height;
    }

    /** 目标当前水平横移速度（格/刻）；宿主没有速度事实时按静止处理。 */
    function gunkshotPace(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var motion = CompanionBehavior.velocity(context, target);
        if (motion === null) return 0;
        return Math.sqrt(motion[0] * motion[0] + motion[2] * motion[2]);
    }

    CompanionBehavior.registerUse("gunkshot", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
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
            var maxChase = CompanionBehavior.ai<number>(capability, "maxChase", 16);
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > maxChase) return 0;
            var reach = capability.data.range, base = distance <= reach ? 18 : 6;
            if (distance <= reach * 0.6) base += 12;
            if (CompanionBehavior.ai<boolean>(capability, "preferBig", true) && gunkshotSize(target) >= 1.6) base += 10;
            var pace = gunkshotPace(context, target);
            if (pace <= 0.05) base += 6;
            else if (pace >= 0.15 && distance > reach * 0.6) base -= 6;
            return base;
        }
    });

    addPreferences("gunkshot", {}, [
        field(pathOf("heavy"), "重装取向", "boolean", {
            help: "开启：威力 ×1.18、顶开 ×1.25，但偏角 ×1.4（更难命中）、装填 +2 刻、冷却 +4 刻，适合赌一次高收益或把大个子轰开。关闭（轻装）：偏角更小、出手更快、冷却更短，但每一发更轻。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 24, step: 1,
            help: "只有在这个距离以内才把对方列为开炮候选，再由共享接近逻辑把身位送进炮程；调大就是更早开始追。"
        }),
        field(pathOf("ai.preferBig"), "优先打大目标", "boolean", {
            help: "开启后，体型大的目标（更不容易被偏角躲开、被顶得更远）排序更靠前；关闭则只按距离排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为开炮离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
