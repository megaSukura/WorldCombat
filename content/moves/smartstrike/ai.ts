/**
 * 修长之角 / smartstrike 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.toughFirst`（默认开）：血量比例高的目标优先——角刺吃目标防御加成，越厚实的对手越值得这一刺；
 * 关闭后按普通远程突刺排序，对残血补刀。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("smartstrike", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            var base = gap <= capability.data.range ? 21 : 3;
            if (!CompanionBehavior.ai<boolean>(capability, "toughFirst", true)) return base;
            // 血量比例越高越像硬目标，角刺的防御加成越值。
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
            help: "开启后，血量比例高的目标优先（角刺吃防御加成）；关闭则只按普通突刺排序，可用于补刀残血。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为锁定目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
