/**
 * 修长之角 / smartstrike 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见、无遮挡的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.toughFirst`（默认开）：防御高的目标优先——角刺吃目标防御加成，越硬的甲越值得这一刺；
 * 原版生物等没有六维的目标回落为按血量比例排序。关闭后按普通远程突刺排序，对残血补刀。
 * 墙挡在中间时角尖会停在接触面，所以不列入候选。
 */
namespace PokemonSkills {
    /** 施法者与目标之间是否无遮挡；墙挡着就够不到，不推荐。同一决策帧内缓存。 */
    function smartstrikeClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "smartstrike:clear:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        });
    }

    CompanionBehavior.registerUse("smartstrike", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return smartstrikeClear(context, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 21 : 3;
            if (!CompanionBehavior.ai<boolean>(capability, "toughFirst", true)) return base;
            // 防御越高，角刺的甲缝加成越值；没有六维的目标（原版生物）按血量比例回落。
            var stats = CompanionBehavior.combatStats(context, target);
            var def: any = stats && stats.stats ? stats.stats.def : null;
            if (typeof def === "number" && isFinite(def)) return base + Math.max(0, Math.min(18, (def - 70) * 0.12));
            if (CompanionBehavior.ratio(target) >= 0.7) return base + 12;
            return base;
        }
    });

    addPreferences("smartstrike", {}, [
        field(pathOf("focus"), "定准", "boolean", {
            help: "开启：锁定距离约 +18%、转向修正 +4 度/刻，追得更远更死，但一刺约 −12%、起手多 4 刻、冷却多 6 刻。关闭：速刺，锁得近、修正少，但一刺更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "突刺距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动锁定，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.toughFirst"), "先刺硬目标", "boolean", {
            help: "开启后，防御高的目标优先（角刺吃防御加成）；没有防御数据的目标按血量比例排序。关闭则只按普通突刺排序，可用于补刀残血。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为锁定目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
