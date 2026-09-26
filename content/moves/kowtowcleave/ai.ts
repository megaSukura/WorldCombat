/**
 * 仆刀 / kowtowcleave 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * 它只追赶得上的敌人：正在高速远离的目标权重下调，不硬追（追近预算有限，追不上就挥空）。
 * `ai.openFirst`（默认开）：目标还满血、又没带空门身份时抬高 priority——跪拜骗防在健康目标身上最值；
 * 目标已经带空门（别人开过或自己刚开过）时把 priority 降下来，先用别的招兑现，不浪费一次跪拜。
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
            var self = CompanionBehavior.source(context).point;
            var base = CompanionBehavior.distance(self, target.point) <= capability.data.range ? 18 : 0;
            // 目标正在高速远离时降权：追近预算有限，赶不上就是一刀空。
            var velocity = CompanionBehavior.velocity(context, target);
            if (velocity) {
                var dx = target.point[0] - self[0], dz = target.point[2] - self[2];
                var span = Math.sqrt(dx * dx + dz * dz) || 1;
                if ((velocity[0] * dx + velocity[2] * dz) / span > 0.08) base = Math.max(0, base - 14);
            }
            if (!CompanionBehavior.ai<boolean>(capability, "openFirst", true)) return base;
            if (CompanionBehavior.status(context, target, "dropguard")) return Math.max(0, base - 8);
            return base + 14;
        }
    });

    addPreferences("kowtowcleave", {}, [
        field(pathOf("feint"), "深拜", "boolean", {
            help: "开启：跪拜更深，空门多降 1 级防、加成 +0.15、持续多 20 刻，但起手多 4 刻、冷却多 6 刻。关闭：快拜快刀，更省更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动仆刀，先走近。越大越愿意从远处扑上来。"
        }),
        field(pathOf("ai.openFirst"), "先开空门", "boolean", {
            help: "开启后，会优先对满血、未带空门的目标跪拜开防；关闭则把它当普通近身攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为接近目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
