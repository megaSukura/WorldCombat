/**
 * 大地之力 / earthpower —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：只接受站在地上的目标（离地的从地脉上方过去，`accepts` 直接排除）；`ai.stillFirst`（默认开）
 *   打开时，移动速度慢的目标排前——地脉在目标脚下发动，站着不动的目标最不容易在亮记号时走开。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再落脉。
 * 放完接什么：交回共享交战计划；裂地是留给战场的痕迹，不改变后续决策。
 */
namespace PokemonSkills {
    function earthpowerStill(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        const velocity = target.velocity;
        if (!velocity) return true;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]) < 0.15;
    }

    CompanionBehavior.registerUse("earthpower", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 22 : 0;
            if (target.grounded === true) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "stillFirst", true) && earthpowerStill(context, target)) score += 6;
            return score;
        }
    });

    addPreferences("earthpower", {}, [
        field(pathOf("fissure"), "裂隙式", "boolean", {
            help: "开启：爆发半径 ×1.4、裂痕块数 ×1.6、碎土 ×1.3，但威力 ×0.88、冷却 +4 刻，适合一次罩住目标脚边一小片。关闭：更窄更痛的一柱地脉，适合点名单体。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动落脉，先走近；越大越愿意对更远的目标掀地。"
        }),
        field(pathOf("ai.stillFirst"), "先打站定的", "boolean", {
            help: "开启后，移动慢的目标优先——地脉在目标脚下发动，站着不动的最不容易在亮记号时走开；关闭则所有目标同价。"
        })
    ]);
}
