/**
 * 强力钻 / hyperdrill 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记贴身的直线凿穿。目标可见、敌对、存活，且在 `ai.maxChase`（默认 8）格内；更远交给
 *   共享接近逻辑。它最值钱的地方是**凿开守护**，所以目标身上有守护时它最想出手。
 * 对谁出手：`ai.breakGuard`（默认开）打开时，身上带着守护（任何 GuardEffects 池）的目标 priority 抬到 92，
 *   抢在共享交战次序之前；没有守护的目标按普通重击排序（18）。
 * 够不到怎么办：reach 就是本招冲距，先走近；钻进途中目标消失或离开范围就收招，不留下任何代价。
 * 放完之后：凿掉的守护当场碎掉，交回共享交战计划。目标没有守护时它仍是一记高额接触重击，不会空转。
 */
namespace PokemonSkills {
    /** 只读探针：目标身上有几层共享守护（world_combat:guard），回调内缓存。 */
    CompanionBehavior.registerFact("world_combat:move_hyperdrill/guards", function (access, actor) {
        if (!access.valid(actor)) return 0;
        return access.effects(actor, "world_combat:guard").length;
    });

    function hyperdrillGuards(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_hyperdrill/guards", target);
        return typeof value === "number" ? value : 0;
    }
    function hyperdrillWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("hyperdrill", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hyperdrillWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !hyperdrillWants(context, capability, target)) return 0;
            let score = 18;
            if (CompanionBehavior.ai<boolean>(capability, "breakGuard", true) && hyperdrillGuards(context, target) > 0) score += 74;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range) score += 6;
            return score;
        }
    });

    addPreferences("hyperdrill", {}, [
        field(pathOf("through"), "贯穿式", "boolean", {
            help: "开启：钻头一路贯穿最多数个目标，射程 ×1.15、钻速 ×1.1，但每一记 ×0.9、起手 +2 刻、冷却 +8 刻，用来钻穿排成一列的人。关闭（定钻式）：钻到第一个目标就收，这一记 ×1.2、出手快、冷却短，用来集中砸穿一个硬目标。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标离自己这么远以内才主动钻过去；调大愿意从更远处发起，也越容易在钻入途中被走位甩开。"
        }),
        field(pathOf("ai.breakGuard"), "优先凿守护", "boolean", {
            help: "开启：目标身上带着守护时大幅提升 priority，抢在共享交战次序前把罩凿开；关闭则只按普通重击排序。"
        })
    ]);
}
