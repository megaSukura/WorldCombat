/**
 * 真空波 / vacuumwave 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 12）格之内；它是远程波，够不到交给共享接近逻辑。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.pullRunners`（默认开）时优先对正在逃开的目标推进——这一道正好把它抽回近身；
 *   身处中远距离（大于 5 格）时更值得用一记远程波先手；贴到脸上（2 格内）则让位给近战，分数压低。
 * 优先次序：基础 21；目标在逃 +14；距离大于 5 格 +6；距离小于 2 格 −6；目标残血 +6。
 * 够不到怎么办：射程由 `reach` 决定，共享任务先把身位收进波面射程再推。
 * 放完之后：被扫到的人朝自己滑，交回共享交战计划继续贴身打。
 */
namespace PokemonSkills {
    function vacuumwaveWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    CompanionBehavior.registerUse(vacuumwaveId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return vacuumwaveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !vacuumwaveWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "pullRunners", true) && CompanionBehavior.fleeing(context, target)) score += 14;
            if (distance > 5) score += 6;
            if (distance < 2) score -= 6;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 6;
            return score;
        }
    });

    addPreferences(vacuumwaveId, {}, [
        field(pathOf("wide"), "扩散式", "boolean", {
            help: "开启：波面更宽（半宽 ×1.6）、覆盖更多人，但每一下威力 ×0.8、射程 ×0.85、吸力摊薄到 ×0.7、冷却 +4 刻。关闭：窄而集中的一道，吸力足、射得远、回得快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "对手离自己这么远以内才主动推波；本招是远程波，设大愿意更早出手。"
        }),
        field(pathOf("ai.pullRunners"), "优先抽逃敌", "boolean", {
            help: "开启：正在逃开的目标排得更前，用这一道把它抽回近身；关闭则只按普通远程候选排序。"
        })
    ]);
}
