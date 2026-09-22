/**
 * 能量球 / energyball —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.verdantFirst`（默认开）打开时，若自己脚下周围有植被（能吸到生机），这一球的优先级抬高——
 *   草木繁茂处正是它最值的时候；站在石头地上则按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再掷。
 * 放完接什么：交回共享交战计划；落点的花草是留给战场的标记，不改变后续决策。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存：数自己周围（少量样本）有几处自然可吸；`access` 是本次决策的只读世界。 */
    CompanionBehavior.registerFact("world_combat:move_energyball/verdant", function (access, actor, _argument) {
        const body = access.observe(actor);
        if (body === null) return 0;
        return energyballNature(access, body.position(), 2.5, 12);
    });

    function energyballVerdantValue(context: WorldBehavior.Context, subject: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_energyball/verdant", subject);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse("energyball", {
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
            const self = CompanionBehavior.source(context);
            const base = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 21 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "verdantFirst", true)) return base;
            return energyballVerdantValue(context, self) > 0 ? base + 12 : base;
        }
    });

    addPreferences("energyball", {}, [
        field(pathOf("deeproot"), "深根形态", "boolean", {
            help: "开启：吸收半径 +1.6 格、每份生机 ×1.3、球心威力 ×1.06，但起手多 4 刻、冷却 +5 刻、射程 −1 格，适合站在草木里打重球。关闭：更快更远但吸得浅，适合石头地上快打。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 5, max: 24, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处先吸后掷。"
        }),
        field(pathOf("ai.verdantFirst"), "先吸草木", "boolean", {
            help: "开启后，自己脚下周围有植被（能吸到生机）时抬高这一球的优先级；关闭则不看环境，只按普通远程攻击排序。"
        })
    ]);
}
