/**
 * 地裂 / fissure 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一个远程处决。`available` 要求目标可见、敌对、存活、**站在地上**、不受地面系免疫，
 *   且在自己 `ai.maxChase`（默认 10）格内；焦点目标不受距离限制。`priority` 在目标生命比例高于
 *   `ai.executionAbove`（默认 0.2）时抬一档——一击必杀该用在还满血的高价值目标上，别浪费在残血身上。
 * 对谁出手：当前威胁；飞在空中的、地面系打不动的（飞行属性）不接受，AI 不会为它们砸地。
 * 够不到交给共享接近逻辑，射程就是裂缝长度；放完之后交回共享顺序，长冷却期间改用别的招。
 */
namespace CompanionBehavior {
    function fissureImmune(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        if (!types || !types.length) return false;
        for (let index = 0; index < types.length; index++) if (CobblemonCombat.typeEffectiveness("ground", types[index]) === 0) return true;
        return false;
    }

    function fissureWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const access = CompanionBehavior.world(context), observed = access.actor(String(target.ref));
        if (observed && access.effects(observed, PokemonSkills.fissureResisted).length) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        return !fissureImmune(target);
    }

    registerUse("fissure", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!fissureWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false && !fissureImmune(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !fissureWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const ratio = target.maximum > 0 ? target.health / target.maximum : 1;
            if (ratio < CompanionBehavior.ai<number>(capability, "executionAbove", 0.2)) return 4;
            return ratio >= 0.6 ? 28 : 22;
        }
    });

    PokemonSkills.addPreferences("fissure", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deep"), "深裂式", "boolean", {
            help: "开启：落点 ×1.25、裂缝更久（×1.35），但张口延迟 +8 刻——坑更大，对手也更容易走开，用来封一块地或逼退走位。关闭（速裂式）：张口更快、冷却更短，但落点更小、裂缝更短，用来抢在对手离开前点掉它。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑地裂；调小只在近处砸，调大愿意隔着一段距离先手点穴。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.executionAbove"), "残血留手阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "目标生命比例低于这个值时，不再把一击必杀浪费在它身上，改用普通招；调大只在目标还很健康时出手。"
        })
    ]);
}
