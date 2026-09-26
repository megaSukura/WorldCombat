/**
 * 回旋踢 / rollingkick 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 7）格内。它只打贴身一个目标，
 *   价值在于把目标**踢飞**、离开掩体或队友身边，所以贴身后才出手。
 * 选择倾向：`ai.finish`（默认开）打开时，残血目标优先——这一腿的抛飞正好把人扔出阵形并收尾；
 *   已经被别招踢懵的目标降一档，把这一脚留给还能动的对手。
 * 空间与地边：踢出方向要有落脚空间（`freeSpace` 探针），敌人身后是墙/危险边时降权，不鲁莽追进去把人踢进死角。
 */
namespace PokemonSkills {
    /** 目标身后踢出方向是否还有可站的空间；没有共享探针时不惩罚，交给人工判断。 */
    function rollingkickSpace(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        if (!LivingActions.hasFreeSpace(world)) return true;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const ux = length < 0.01 ? 0 : dx / length, uz = length < 0.01 ? 1 : dz / length;
        const width = typeof target.width === "number" && target.width > 0 ? target.width : 0.9;
        const height = typeof target.height === "number" && target.height > 0 ? target.height : 1.4;
        const feet = CompanionBehavior.point([target.point[0] + ux * 1.2, target.point[1] - height / 2, target.point[2] + uz * 1.2]);
        return LivingActions.freeSpace(world, feet, width, height);
    }

    function rollingkickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(rollingkickId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rollingkickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rollingkickWants(context, capability, target)) return 0;
            let base = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.5) base += 12;
            if (CompanionBehavior.status(context, target, "flinch")) base -= 8;
            if (!rollingkickSpace(context, target)) base = Math.max(6, base - 12);
            return base;
        }
    });

    addPreferences(rollingkickId, {}, [
        field(pathOf("liftoff"), "抛飞式", "boolean", {
            help: "开启：把目标抛得更远更高、起旋更久、冷却更长，适合把人踢出掩体或踢离队友。关闭（盘踢式，默认）：踢得更重、起手更快、冷却更短，但抛得近、弧线平。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动起旋，先走近。越大越会在稍远处扑踢，也越容易在起旋窗口被对手走开。"
        }),
        field(pathOf("ai.finish"), "先踢残血", "boolean", {
            help: "开启：残血目标优先，这一腿的抛飞正好收尾；关闭：只按普通排序，不为收尾加分。"
        })
    ]);
}
