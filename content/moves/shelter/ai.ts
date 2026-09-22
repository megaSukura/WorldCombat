/**
 * 闭关 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、威胁进入 ai.trigger 以内、且自己身上还没有壳时合壳。
 * 什么时候最想出手：贴脸（≤4 格）又残血（低于 ai.panic）时抬到 105 抢在共享顺序前——壳要在被打崩之前合上；
 *   其余情况 60，排在共用的自保次序里。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（铁盾形态合壳后会钉住自己，这是它的取舍）。
 * 放完之后：壳先吃伤害、吃满即崩；壳还在时不再重复，崩掉或到期后才重新考虑。
 * 配置 seal（铁盾／缩壳）改变承伤额度、时长与是否钉住；ai.trigger、ai.panic 决定多近合壳、残到什么程度抢手。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shelter", {
        protocols: ["world_combat:survive"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "shelter")) return false;
            if (CompanionBehavior.guarded(context, self, "world_combat:shelter")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0) return false;
            return CompanionBehavior.distance(self.point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "trigger", 8);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, threat.point) <= 4;
            return close && CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "panic", 0.5) ? 105 : 60;
        }
    });

    addPreferences("shelter", {}, [
        field(pathOf("ai.trigger"), "合壳距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁进入这个距离才考虑合壳；越大越早预判，也越可能白合；越小越省，但可能来不及。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值且贴身时抢在共享顺序前合壳；调高更早进入龟缩姿态，调低只在濒危时才合。"
        })
    ]);
}
