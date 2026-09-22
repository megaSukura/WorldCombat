/**
 * 出奇一击 / feintattack 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.backline`（默认开）：目标正背对自己（速度方向背离自己）时抬高 priority——绕背打的就是没防备的那一侧。
 * 配置 decoy（佯攻／潜袭）在「花时间留替身牵制」与「更快更省地直接绕背」之间取舍。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("feintattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            let base = gap <= capability.data.range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "backline", true)) {
                const velocity = CompanionBehavior.velocity(context, target);
                if (velocity) {
                    const away = [target.point[0] - self.point[0], 0, target.point[2] - self.point[2]];
                    if (velocity[0] * away[0] + velocity[2] * away[2] > 0.0002) base += 12;
                }
            }
            return base;
        }
    });

    addPreferences("feintattack", { decoy: false, ai: { maxChase: 9, backline: true } }, [
        field(pathOf("decoy"), "佯攻", "boolean", {
            help: "开启（佯攻）：在对手正面留一个暗影替身短暂引开它的注意力，自己从背后打；起手多 4 刻、冷却多 8 刻。关闭（潜袭）：不设替身，直接绕背，更快更省。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 18, step: 1,
            help: "目标在这个距离内才考虑绕背；调大愿意追更远的目标。"
        }),
        field(pathOf("ai.backline"), "追背对的目标", "boolean", {
            help: "开启后，正背对自己（向外移动）的敌人优先成为绕背目标；关闭则只按普通近战排序。"
        })
    ]);
}
