/**
 * 磁铁炸弹 / magnetbomb 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * 身上已经吸着钢弹（任何来源的 world_combat:status/magnetbomb）的目标降低 priority，等它先炸；
 * `ai.focused`（默认开）让生命还高的目标更优先——引信是一笔会兑现的伤害投资。
 * 配置 cluster（集火／分投）在「单体更痛」与「覆盖一圈」之间取舍。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("magnetbomb", {
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
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let base = gap <= capability.data.range ? 22 : 0;
            if (CompanionBehavior.status(context, target, "magnetbomb")) return base - 12;
            const maximum = target.maximum;
            if (CompanionBehavior.ai<boolean>(capability, "focused", true)
                && typeof maximum === "number" && maximum > 0 && target.health / maximum > 0.5) base += 6;
            return base;
        }
    });

    addPreferences("magnetbomb", { cluster: false, ai: { maxChase: 13, focused: true } }, [
        field(pathOf("cluster"), "集火", "boolean", {
            help: "开启（集火）：全部钢弹砸向选定目标，单体更痛，但起手多 2 刻、覆盖面小。关闭（分投）：钢弹分给射程内的每个敌人，覆盖更广，但单个目标只吃到一份。"
        }),
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动发射，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.focused"), "优先满血目标", "boolean", {
            help: "开启后，生命还高的敌人优先吃炸弹（引信伤害更值）；关闭则按普通远程攻击排序。"
        })
    ]);
}
