/**
 * 雷电囚笼 / thundercage 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 以内；自己不在坐骑上；身上还没有
 * `partiallytrapped`（已经关着再放是浪费，重复施放只替换旧笼）。`ai.preferMovers` 开启时只对正在移动或
 * 逃跑的威胁立笼——越会横跑的目标越值得用电栅限制它的活动边缘。
 * 对谁出手：焦点目标优先，高机动、正在逃跑的目标另加一档；它是最重的一记，所以站到射程内就愿意出手。
 * 对原生抗推的 Boss 只指望初击与笼内周期电击的收益：它硬冲侧壁即解笼，不期待被无限锁回。
 * 够不到怎么办：交给共享接近逻辑把身位收到射程内。
 * 放完之后：交回共享交战计划；目标仍被关着时不再重复。
 */
namespace PokemonSkills {
    function thundercageMoving(target: CompanionBehavior.Entity): boolean {
        if (!target.velocity) return false;
        return Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) > 0.05;
    }

    function thundercageWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        if (CompanionBehavior.ai<boolean>(item, "preferMovers", false)
            && !thundercageMoving(target) && !CompanionBehavior.fleeing(context, target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    CompanionBehavior.registerUse("thundercage", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return thundercageWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !thundercageWants(context, capability, target)) return 0;
            let base = 22;
            if (thundercageMoving(target)) base += 14;
            if (CompanionBehavior.fleeing(context, target)) base += 20;
            if (context.facts.focus === target.ref) base += 18;
            return base;
        }
    });

    addPreferences("thundercage", {}, [
        field(pathOf("wide"), "广笼式", "boolean", {
            help: "开启：笼半径 ×1.35、笼柱更多、持续 ×1.15、冷却 +8，但初击 ×0.9、电击 ×0.85，关得更宽更久。关闭：更小更紧、电得更重。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 22, step: 1,
            help: "威胁离自己这么远以内才考虑立笼；调小只在近处关人，调大愿意从更远处先手围住。"
        }),
        field(pathOf("ai.preferMovers"), "只关移动目标", "boolean", {
            help: "开启：只对正在移动或逃跑的威胁立笼，专门限制横跑者的活动边缘；关闭：对任何范围内的威胁都愿意关。对原生抗推目标只按初击与周期电击的收益计算，不指望无限锁。"
        })
    ]);
}
