/**
 * 舍身冲撞 / doubleedge 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。这是一记有反震但不算极端的正面猛撞，
 * 所以门槛比木槌、双刃头锤低：自身生命高于 `ai.minHealth`，或对手已经残到值得一收时就排到前面；
 * 残血目标在射程内时最优先（撞飞的那一下往往就是终结）。`ai.minHealth` 越高越珍惜自己、越少抢收残血。
 * 放完之后：目标被顶飞了，继续朝它压上去，把撞开的身位变成下一次出手的距离；贴住压身的破绽由玩家/对手抓。
 */
namespace PokemonSkills {
    function doubleedgeValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function doubleedgeAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        if (!progress.chaseUntil) progress.chaseUntil = context.tick + 40;
        if (context.tick > progress.chaseUntil) return;
        const threat = CompanionBehavior.goalEntity(context);
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) <= 3.4) return;
        const navigation = CompanionBehavior.navigate(context, threat.point, 3);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("doubleedge", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!doubleedgeValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.3);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth
                || CompanionBehavior.ratio(target) <= 0.35;
        },
        accepts: function (context, capability, target) { return doubleedgeValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ratio(target) <= 0.35) return 60;
            return 24;
        },
        after: function (context, capability, target, progress) { return doubleedgeAfter(context, progress); }
    });

    addPreferences("doubleedge", {}, [
        field(pathOf("brace"), "定桩式", "boolean", {
            help: "开启：把重心全压上去、把目标顶得更远、压身更久，但反震更重、起手与收招更慢——适合把人推离队友或推下高台。关闭（猛进式）：撞完更快收势、反震更轻，顶飞略近。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动发起舍身冲撞，先靠近。越大越早发起，也越容易冲空。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动冲撞（除非对手已残）。越高越珍惜自己，也越少抢收残血。"
        })
    ]);
}
