/**
 * 大愤慨 的伙伴 AI 用途：一套「一路喷火冲过去、把地面点着」的出手计划。
 *
 * 什么局面有意义：威胁可见、敌对、存活，且在 ai.maxChase（默认 9）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁。**正处于恍惚（共享身份 confusion）时不出手**——刚烧完的自己就是乱的。
 * 够不到怎么办：reach 就是冲锋距离，够不到就由共享任务走近。
 * 放完之后：目标被点着又推开，伙伴会跟着压上去一小段，把对方留在刚点起的火场里。
 * ai.finishLow：目标残血时是否优先用大愤慨收尾（默认关，因为这一招更偏向铺火而不是点杀）。
 */
namespace CompanionBehavior {
    function furyValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function furyAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 44;
        if (context.tick > progress.chaseUntil) return;
        const threat = CompanionBehavior.goalEntity(context);
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3.0) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 3);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse(PokemonSkills.ragingfuryId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), "confusion")) return false;
            if (!target) return true;
            if (!furyValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) { return furyValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const finish = CompanionBehavior.ai<boolean>(capability, "finishLow", false);
            return finish && CompanionBehavior.ratio(target) <= 0.35 ? 54 : 24;
        },
        after: function (context, capability, target, progress) { return furyAfter(context, progress); }
    });

    PokemonSkills.addPreferences(PokemonSkills.ragingfuryId, {}, [
        PokemonSkills.field(PokemonSkills.pathOf("inferno"), "烈焰", "boolean", {
            help: "开启：落点火场更大更久、点燃更久，但冲锋更短、起手与冷却更久、冲完晕得更久——适合守要道、封走位。关闭（奔袭）：冲得更远、节奏更快、失控更短，代价是留下的火场更小更短。"
        }),
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 16, 1),
        PokemonSkills.flag("ai.finishLow", "抢收残血")
    ]);
}
