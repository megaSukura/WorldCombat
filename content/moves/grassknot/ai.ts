/**
 * 打草结 / grassknot 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内，且体量达到 `ai.minMass`（默认 0＝总是可以）。
 * 对谁出手：**优先重的目标**——分量就是这招的全部；已经带着 `tripped` 身份的目标排到后面，不重复缠。
 * 够不到怎么办：距离交给 `reach`，共享任务把身位收进射程；`available` 只判断「值不值得把这一招列入候选」。
 * 放完接什么：交回共享交战计划；它是一记远程削弱，不负责收尾。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的目标质量观察（百克＝hg）；宝可梦读原生体重，其他生物返回 null 由调用处按体型估算。 */
    

    /** 目标质量（hg）：优先原生体重，缺失时按碰撞箱体积估算。 */
    function grassknotMassOf(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const mass = CompanionBehavior.mass(context, target);
        if (typeof mass === "number" && mass > 0) return mass;
        if (typeof target.width === "number" && typeof target.height === "number")
            return target.width * target.width * target.height * 1000;
        return 0;
    }

    CompanionBehavior.registerUse("grassknot", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            return grassknotMassOf(context, target) >= CompanionBehavior.ai<number>(capability, "minMass", 0) * 10;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.status(context, target, "tripped")) return 14;
            const mass = grassknotMassOf(context, target);
            if (mass >= 1000) return 56;
            if (mass >= 500) return 40;
            return 24;
        }
    });

    addPreferences("grassknot", {}, [
        field(pathOf("knot"), "缠绞式", "boolean", {
            help: "开启：缠结范围更大、绊住更久、失衡更重，但缠绊延迟更长（更容易被迈开）、单发威力略低、收招与冷却更久。关闭：小范围快绊，单发更重、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "播种距离", "number", {
            min: 3, max: 16, step: 1,
            help: "对手进入这个距离内才考虑播种；调大愿意先手从远处绊一脚，调小只在近处缠。"
        }),
        field(pathOf("ai.minMass"), "只缠重物", "number", {
            min: 0, max: 400, step: 10,
            help: "目标体重低于这个值（单位 kg）时不主动发起打草结；0＝总是可以。调高能把这一招专门留给笨重的对手。"
        })
    ]);
}
