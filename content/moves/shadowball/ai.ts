/**
 * 暗影球 / shadowball —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.sunderFirst`（默认开）打开时，特防还没被压过的目标排前（一记碾防对干净目标更值），
 *   已经被压过的目标仍可打，但不再额外加价；关闭时所有目标同价，只按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是一记远程点射，不负责收尾。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的目标特防能力等级（宝可梦读原生等级，其他生物读 CombatStages）。 */
    

    function shadowballSunderValue(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const stage = CompanionBehavior.stage(context, target, "spd");
        return typeof stage === "number" ? stage : 0;
    }

    CompanionBehavior.registerUse("shadowball", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "sunderFirst", true)) return base;
            return shadowballSunderValue(context, target) >= 0 ? base + 10 : base;
        }
    });

    addPreferences("shadowball", {}, [
        field(pathOf("dense"), "凝影形态", "boolean", {
            help: "开启：影球威力 ×1.12、判定 ×1.15，但飞行 ×0.84、射程 −2 格、冷却 +4 刻，起手多 1 刻，适合贴身硬砸。关闭：更快更远但更轻，适合中距离点射。"
        }),
        field(pathOf("ai.maxChase"), "点射距离", "number", {
            min: 5, max: 26, step: 1,
            help: "超过这个距离就不主动出手，先走近；越大越愿意在更远处先手掷球。"
        }),
        field(pathOf("ai.sunderFirst"), "先打没被碾过的", "boolean", {
            help: "开启后，特防还没被压低过的目标优先（碾防对干净目标更值）；关闭则所有目标同价，只按普通远程攻击排序。"
        })
    ]);
}
