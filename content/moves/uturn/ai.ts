/**
 * 急速折返 / uturn 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 8 格）以内——比冲刺距离宽一些，留给共享接近逻辑把身位收进射程。
 * 对谁出手：优先能收掉的残血目标（一记折返顺带走一个），其次是被自己血量逼出来的脱身——`ai.fleeBelow`（默认
 *   0.4）以下时排到最前，因为它出手就是脱离。附近有可接应的伙伴（`handoff` 开启时）再加一点，归队比孤身拉远更稳。
 * 够不到怎么办：reach 就是本招射程，不够就交给共享接近逻辑。
 * 放完之后：身位已经交回自己一侧，交回共享交战计划继续。
 */
namespace PokemonSkills {
    function uturnWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** `rally` 内在背离目标一侧、可接应的伙伴数量。 */
    function uturnReady(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const rally = p("uturn", "rally", world);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || !other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) > rally) continue;
            const along = (other.point[0] - self.point[0]) * (target.point[0] - self.point[0])
                + (other.point[2] - self.point[2]) * (target.point[2] - self.point[2]);
            if (along <= 1) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("uturn", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return !target || uturnWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !uturnWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 14;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "fleeBelow", 0.4)) score += 20;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 12;
            if (capability.data.config.handoff === true) score += Math.min(10, uturnReady(context, target) * 5);
            return score;
        }
    });

    addPreferences("uturn", {}, [
        field(pathOf("handoff"), "交棒式", "boolean", {
            help: "开启：折返时退到接应半径内最近的等候伙伴身边，折返距离收紧到 ×0.78，有人接应更稳但离敌人不够远。关闭（远遁式）：沿弧线径直拉回、折返距离 ×1.15，离敌人最远，代价是脱离自己的伙伴。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "对手离自己这么远以内才尝试切进去；本招冲刺距离短，调大也常够不到，调小则只在贴身时折返。"
        }),
        field(pathOf("ai.fleeBelow"), "脱身血量", "number", {
            min: 0.15, max: 0.9, step: 0.05,
            help: "自己血量比例低于这个值时，把折返排到最前用来脱身；调高更早脱身，调低只在濒危时才用。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会折返脱离；关闭则只在原地方便时施放。"
        })
    ]);
}
