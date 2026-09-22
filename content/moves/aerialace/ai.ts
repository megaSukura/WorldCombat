/**
 * 燕返 / aerialace 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.skirmish`（默认开）：目标正在移动（追人或逃跑）时抬高 priority——掠袭是追着人切过去的，
 * 移动中的目标正合刀路；目标静止时按普通近身斩排序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("aerialace", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 20 : 4;
            if (!CompanionBehavior.ai<boolean>(capability, "skirmish", true)) return base;
            // 移动中的目标（velocity 非零）优先——掠袭刀路正拦在它前面。
            var velocity = CompanionBehavior.velocity(context, target);
            if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0004) return base + 12;
            return base;
        }
    });

    addPreferences("aerialace", {}, [
        field(pathOf("skim"), "低掠", "boolean", {
            help: "开启：压低身子掠得更宽、射程更长，能一次扫到并排的敌人，但单刀约 −18%、起手多 2 刻、冷却多 4 刻。关闭：高掠，刀路窄而重，一发更疼、更快。"
        }),
        field(pathOf("ai.maxChase"), "掠袭距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动燕返，先走近。越大越愿意从远处一步切上来。"
        }),
        field(pathOf("ai.skirmish"), "追动目标", "boolean", {
            help: "开启后，正在移动的敌人优先成为燕返目标（刀路拦得住移动）；关闭则只按普通近身斩排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为切入目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
