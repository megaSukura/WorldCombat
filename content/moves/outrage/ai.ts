/**
 * 逆鳞 的伙伴 AI 用途：一套「认准一个人，撞到底」的出手计划。
 *
 * 什么局面有意义：对手可见、敌对、存活，且在 ai.maxChase（默认 10）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁。**正处于恍惚（共享身份 confusion）时不出手**——刚大闹完的龙自己就是乱的，这是这一招的代价。
 * 够不到怎么办：reach 就是冲撞距离，够不到就由共享任务走近；接近本身就是锁定前的最后一步。
 * 放完之后：若目标还活着，伙伴会顺着再压上去一小段，把顶开的身位重新贴回来。
 * ai.finishLow：目标残血时是否优先用逆鳞的终结撞收尾。
 */
namespace CompanionBehavior {
    function outrageValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function outrageAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 40;
        if (context.tick > progress.chaseUntil) return;
        const threat = CompanionBehavior.goalEntity(context);
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3.2) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 3);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse(PokemonSkills.outrageId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), "confusion")) return false;
            if (!target) return true;
            if (!outrageValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) { return outrageValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const finish = CompanionBehavior.ai<boolean>(capability, "finishLow", true);
            return finish && CompanionBehavior.ratio(target) <= 0.35 ? 58 : 25;
        },
        after: function (context, capability, target, progress) { return outrageAfter(context, progress); }
    });

    PokemonSkills.addPreferences(PokemonSkills.outrageId, {}, [
        PokemonSkills.field(PokemonSkills.pathOf("relentless"), "穷追", "boolean", {
            help: "开启：冲得更远、把目标顶得更狠、终结更重，但起手与冷却更久、闹完晕得更久——适合黏住会跑的对手。关闭（疾撞）：贴得更近、节奏更快、失控更短，代价是够不到远处的目标。"
        }),
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 18, 1),
        PokemonSkills.flag("ai.finishLow", "抢收残血")
    ]);
}
