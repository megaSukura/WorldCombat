/**
 * 毒针 / poisonsting —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带毒针的伙伴把它当**便宜的远程消耗**：目标可见、敌对、存活、
 *   在 `ai.maxChase`（默认 14）以内就点射；更远交给共享接近逻辑，因为射程也就 11～15 格。
 * 对谁出手：`ai.spreadVenom`（默认开）打开时，未中毒的目标排得更前——这一发就是用来把毒铺开的；
 *   关闭则所有目标一视同仁（对已毒目标它只是再补一点伤害）。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：只有伤害与「渗毒」两拍，伙伴立刻交回共享顺序；冷却最短，下一次决策往往还能再点。
 * 优先级：基础 18（未毒且在射程内）／22（已毒目标只按普通远程排序时 +4，避免空转）／6（还要先走近）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("poisonsting", {
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
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return 0;
            if (distance > capability.data.range) return 6;
            const poisoned = CompanionBehavior.status(context, target, "poison");
            if (!CompanionBehavior.ai<boolean>(capability, "spreadVenom", true)) return 22;
            return poisoned ? 12 : 18;
        }
    });

    addPreferences("poisonsting", {}, [
        field(pathOf("barbed"), "倒钩针", "boolean", {
            help: "开启：中毒概率 ×1.3、中毒时长 ×1.25，但针尖威力 ×0.85、飞行速度 ×0.85——更容易留住毒，但更难打疼、更难追上走位。关闭（光滑细针）：飞得更快、威力 ×1.1，代价是留毒更少更短。"
        }),
        field(pathOf("ai.maxChase"), "点射距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动甩针，先走近；越大越愿意在更远处开始点射。"
        }),
        field(pathOf("ai.spreadVenom"), "优先未毒目标", "boolean", {
            help: "开启后，未中毒的目标排得更前，把毒铺到更多人身上；关闭则所有目标同等对待，对已毒目标只是补伤害。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为点射离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
