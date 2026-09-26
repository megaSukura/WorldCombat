/**
 * 高速星星 / swift 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标时列入候选；够不到交给共享接近逻辑。
 * 遮挡会明显降低收益：目标被墙挡住时权重下调，因为星会撞墙熄灭。
 * `ai.spread`（默认开）让它数一数目标身边还有几个看得见的敌人：有第二个时抬高 priority，因为散星能同时咬住两个。
 * 关掉后只按普通远程攻击使用（聚星收单）。
 */
namespace PokemonSkills {
    /** 目标与自身之间是否有一条能让星飞过去的空路；同一决策帧内缓存。 */
    function swiftClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "swift:clear:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        });
    }

    CompanionBehavior.registerUse("swift", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 22 : 0;
            if (!swiftClear(context, target)) base = Math.max(0, base - 12);
            if (!CompanionBehavior.ai<boolean>(capability, "spread", true)) return base;
            var nearby = context.facts.nearby as CompanionBehavior.Entity[];
            for (var i = 0; i < nearby.length; i++) {
                var other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 5 && swiftClear(context, other)) return base + 18;
            }
            return base;
        }
    });

    addPreferences("swift", {}, [
        field(pathOf("scatter"), "散星", "boolean", {
            help: "开启：星分散到射程内每个看得见的对手，覆盖更广，但选定目标吃到的星更少、起手多 2 刻、冷却多 3 刻。关闭：全部星集中打选定目标，单体更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动发射，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.spread"), "散星取材", "boolean", {
            help: "开启后，目标身边还有别的看得见的敌人时优先发射，让散星同时咬住两个；关闭则只按普通远程攻击排序（聚星收单）。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时发射。"
        })
    ]);
}
