/**
 * 佯攻 / feint 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记贴身的破守戳击。目标可见、敌对、存活，且在 `ai.maxChase`（默认 7）格内；更远交给
 *   共享接近逻辑。这招不靠伤害取胜，真正的价值是**把对手撑起来的守护掀掉**，所以目标身上有守护时它最想出手。
 * 对谁出手：`ai.breakGuard`（默认开）打开时，身上带着守护（任何 GuardEffects 池）的目标 priority 抬到 94，
 *   抢在共享交战次序之前；没有守护的目标按普通快攻排序（13）。
 * 够不到怎么办：reach 就是本招突进距离，先走近；扑进途中目标消失或离开范围就收招，不留下任何代价。
 * 放完之后：掀掉的守护当场碎掉，交回共享交战计划。目标没有守护时它仍是一记可用的小戳击，不会空转。
 */
namespace PokemonSkills {
    /** 只读探针：目标身上有几层共享守护（world_combat:guard），回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_feint/guards", function (access, actor) {
        if (!access.valid(actor)) return 0;
        return access.effects(actor, "world_combat:guard").length;
    });

    function feintGuards(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_feint/guards", target);
        return typeof value === "number" ? value : 0;
    }
    function feintWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    CompanionBehavior.registerUse("feint", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return feintWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !feintWants(context, capability, target)) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "breakGuard", true) && feintGuards(context, target) > 0) return 94;
            return 13;
        }
    });

    addPreferences("feint", {}, [
        field(pathOf("commit"), "实招", "boolean", {
            help: "开启：收掉假动作真打出去，戳击 ×1.35、每层破绽加成 +0.1、多掀一层守护、突进 ×1.1；代价是起手 +3 刻、收招 +2 刻、冷却 +10 刻。关闭（佯攻）：出手极快、冷却短，掀掉守护是它唯一的重心，伤害很轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才主动扑出去；调大愿意从更远处发起，也越容易在扑进途中被走位甩开。"
        }),
        field(pathOf("ai.breakGuard"), "优先掀守护", "boolean", {
            help: "开启：目标身上带着守护时大幅提升 priority，抢在共享交战次序前把罩掀掉；关闭则只按普通快攻排序。"
        })
    ]);
}
