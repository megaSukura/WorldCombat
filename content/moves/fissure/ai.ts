/**
 * 地裂 / fissure 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个远程定点重创。`available` 要求目标可见、敌对、存活、**站在地上**、不受地面系免疫，
 *   且在 `ai.maxChase`（默认 10）格内；并且从施法者脚面到目标脚面之间要有连续的真实地面（与招式判定同一套
 *   `SurfacePaths`），断崖、高墙或另一楼层连不过去就不出手。焦点目标不受距离限制。
 * 对谁出手：当前威胁；飞在空中的、地面系打不动的（飞行属性）不接受。站得稳、不动的高价值目标优先——
 *   它更适合吃这一记定点重创。
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
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        return !fissureImmune(target);
    }

    /** 施法者脚面到目标脚面是否沿连续真实地面连得起来；与招式判定共用同一条 SurfacePaths 路线。 */
    function fissureReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const selfFeet = CompanionBehavior.point([self.point[0], self.point[1] - (self.height || 1.4) / 2, self.point[2]]);
        const targetFeet = CompanionBehavior.point([target.point[0], target.point[1] - (target.height || 1.4) / 2, target.point[2]]);
        return PokemonSkills.fissureRoute(world, selfFeet, targetFeet, Math.max(4, item.data.range)) !== null;
    }

    registerUse("fissure", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context) { return context.facts.self.grounded !== false; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!fissureWants(context, capability, target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
            return fissureReachable(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && target.grounded !== false && !fissureImmune(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !fissureWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const ratio = target.maximum > 0 ? target.health / target.maximum : 1;
            let base = ratio >= 0.6 ? 26 : 22;
            // 站得稳、不挪窝的目标更适合吃这一记定点重创。
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
            if (speed < 0.05) base += 4;
            return base;
        }
    });

    PokemonSkills.addPreferences("fissure", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deep"), "深裂式", "boolean", {
            help: "开启：落点 ×1.25、裂纹更久（×1.35），但张口延迟 +8 刻——坑更大，对手也更容易走开，用来逼退走位。关闭（速裂式）：张口更快、冷却更短，但落点更小、裂纹更短，用来抢在对手离开前点掉它。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑地裂；调小只在近处砸，调大愿意隔着一段距离先手点穴。"
        })
    ]);
}
