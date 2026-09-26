/**
 * 冰砾 / iceshard 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 14）格之内。它是瞬发的远程物理招，
 *   愿意从更外侧先手；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：中远距离（大于 6 格）时多一档分——这是它作为远程点射的价值；`ai.finish`（默认开）时残血目标多一档分，
 *   用一记瞬发冰砾点掉；贴到脸上（2 格内）让位给近战，分数压低。
 * 优先次序：基础 21；距离大于 6 格 +8；目标残血 +8；距离小于 2 格 −6。
 * 够不到怎么办：射程由 `reach` 决定，共享任务先把身位收进掷程再掷。
 * 放完之后：目标被冻僵（共享身份 chill）；本招不铺地面，AI 不会为了造场地反复出招；交回共享交战计划继续打。
 */
namespace PokemonSkills {
    function iceshardWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse(iceshardId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return iceshardWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !iceshardWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 21;
            if (distance > 6) score += 8;
            if (distance < 2) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) score += 8;
            return score;
        }
    });

    addPreferences(iceshardId, {}, [
        field(pathOf("shatter"), "碎冰式", "boolean", {
            help: "开启：首次撞实体时崩碎，溅到周围一圈敌人（各按溅射系数吃主伤害），代价是飞行速度 ×0.85、射程 −2 格、收招 +2 刻、冷却 +8 刻。关闭：单发硬冰砾，飞得快、扔得远、回得快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 22, step: 1,
            help: "对手离自己这么远以内才主动掷冰砾；本招是瞬发远程，设大愿意更早出手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用一记瞬发冰砾点掉；关闭则所有目标同价。"
        })
    ]);
}
