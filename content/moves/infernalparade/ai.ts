/**
 * 群魔乱舞 / infernalparade 的 AI 用途。
 *
 * 什么局面下出手：追踪的鬼火远程，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 对谁出手：目标带着**任意异常**（灼伤、麻痹、中毒／剧毒、冰冻、睡眠）时 priority 最高（每团各翻倍）；
 *   还在移动的目标再加一档——鬼火会追，跑动的人更容易被整队收拢；被墙完全挡住的窄口子目标则降一档，因为鬼火会先撞墙。
 *   近距目标若在鬼火开始转向之前就被直飞掠过，整队反而绕不回来，也降一档。
 *   它乐于先让别的招上状态，再用乱舞收。
 */
namespace PokemonSkills {
    /** 目标身上是否带着任意主异常；用于把吃倍率的候选排到前面。 */
    function infernalparadeAfflicted(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.status(context, target, "burn") || CompanionBehavior.status(context, target, "paralysis")
            || CompanionBehavior.status(context, target, "poison") || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "sleep");
    }

    /** 本招直飞阶段实际走过的距离：用公式值经射程收束后乘速度。近距目标小于它时来不及转向。 */
    function infernalparadeStraightReach(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        const values = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const speed = Math.max(0.2, p("infernalparade", "wispSpeed", values));
        const raw = Math.max(1, p("infernalparade", "orbitDelay", values));
        return infernalparadeStraight(Number(capability.data.range) || 13, raw, speed) * speed;
    }

    CompanionBehavior.registerUse("infernalparade", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 16;
            if (infernalparadeAfflicted(context, target)) score += 29;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity && Math.abs(velocity[0]) + Math.abs(velocity[2]) > 0.02) score += 6;
            // 近距还没转到就掠过目标：直飞距离相对目标很近时整队绕不回来，降一档。
            if (gap < infernalparadeStraightReach(context, capability) + 1.5) score -= 10;
            if (!CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) score -= 10;
            return Math.max(0, score);
        }
    });

    addPreferences("infernalparade", {}, [
        field(pathOf("dirge"), "挽歌", "boolean", {
            help: "开启：鬼火多一团、追踪转向 ×1.3，但飞行速度 ×0.8、收招与冷却各多 2／5 刻。关闭：更快更省，转向按基准。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 24, step: 1,
            help: "超过这个距离就不主动起舞，先走近。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
