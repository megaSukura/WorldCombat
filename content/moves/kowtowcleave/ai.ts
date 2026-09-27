/**
 * 仆刀 / kowtowcleave 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * 空门加成来自可观察的诱敌，所以优先正在朝自己压近、或已经把攻击对着自己的目标：
 * 这两类最可能跪拜期间真的上钩。正在高速远离的目标权重下调，不硬追（追近预算有限，追不上就挥空）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("kowtowcleave", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var self = CompanionBehavior.source(context);
            var base = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 18 : 0;
            // 目标正朝自己压近的最值得等它上钩；正在高速远离的追不上，降权。
            var velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                var dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
                var span = Math.sqrt(dx * dx + dz * dz) || 1;
                var closing = (velocity[0] * dx + velocity[2] * dz) / span;
                if (closing > 0.08) base += 10;
                else if (closing < -0.08) base = Math.max(0, base - 14);
            }
            // 已经把攻击对着自己的目标最容易上钩。
            if (target.attacking !== undefined && String(target.attacking) === String(self.ref)) base += 8;
            return base;
        }
    });

    addPreferences("kowtowcleave", {}, [
        field(pathOf("feint"), "深拜", "boolean", {
            help: "开启：跪拜更深，骗成时空门加成 +0.15，但起手多 4 刻、冷却多 6 刻。关闭：快拜快刀，更省更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动仆刀，先走近。越大越愿意从远处扑上来。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为接近目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
