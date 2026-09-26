/**
 * 磁铁炸弹 / magnetbomb 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * 身上已经吸着钢弹（任何来源的 world_combat:status/magnetbomb）的目标大幅降低 priority，先把炸弹分给还没被覆盖的人，
 * 避免无收益刷新；`ai.focused`（默认开）让周围敌人更多的目标（敌群中心）更优先——引信炸开时溅射一圈。
 * 配置 cluster（集火／分投）在「单体更痛」与「覆盖一圈」之间取舍。
 */
namespace CompanionBehavior {
    registerUse("magnetbomb", {
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
            let base = gap <= capability.data.range ? 22 : 0;
            // 已吸着钢弹的目标先让位，把这一轮分给尚未覆盖的人。
            if (CompanionBehavior.status(context, target, "magnetbomb")) return base - 30;
            if (CompanionBehavior.ai<boolean>(capability, "focused", true)) {
                const nearby = context.facts.nearby || [];
                let crowd = 0;
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.ref === self.ref || other.ref === target.ref || other.friendly) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 4) crowd++;
                }
                base += Math.min(3, crowd) * 5;
            }
            return base;
        }
    });

    PokemonSkills.addPreferences("magnetbomb", { cluster: false, ai: { maxChase: 13, focused: true } }, [
        PokemonSkills.field(PokemonSkills.pathOf("cluster"), "集火", "boolean", {
            help: "开启（集火）：全部钢弹砸向选定目标，单体更痛，但起手多 2 刻、覆盖面小。关闭（分投）：钢弹分给射程内的每个敌人，覆盖更广，但单个目标只吃到一份。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "射击距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动发射，先走近。越大越会在更远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.focused"), "优先敌群", "boolean", {
            help: "开启后，周围敌人更多的目标优先吃炸弹，让爆炸溅到一圈；关闭则只按普通远程攻击排序，不看人群密度。"
        })
    ]);
}
