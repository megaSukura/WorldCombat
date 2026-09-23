/**
 * 防御指令 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内时先召一队手下贴上身，再回头交战。
 *   甲壳还在身上时不再重复召唤（本招会拒绝 already-guarded）。
 * 什么时候最想出手：血量掉到 ai.panic 以下（正在挨压）时 priority 104 抢在共享次序前——防招要在被打崩之前召好；
 *   只是有威胁时退回 88，先按普通次序交战。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：甲壳的等级随活着的手下浮动；手下被清掉后甲壳变薄，本招在窗口内不再重召，等甲壳散尽再考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_defendorder/guards", function (access, actor, _argument) {
        const state = defendorderRead(access, actor);
        if (state === null) return 0;
        let live = 0;
        for (let i = 0; i < state.refs.length; i++) {
            const body = access.actor(String(state.refs[i]));
            if (body !== null && access.valid(body)) live++;
        }
        return live;
    });

    CompanionBehavior.registerUse("defendorder", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "defendorder")) return false;
            if (!threat) return false;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            return distance >= CompanionBehavior.ai<number>(capability, "minGap", 2)
                && distance <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.55);
            return CompanionBehavior.ratio(self) < panic ? 104 : 88;
        }
    });

    addPreferences("defendorder", {}, [
        field(pathOf("ai.maxChase"), "召令距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先召手下；越大越早开始叠甲壳。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再召唤、直接交战；调大更常在近身时放弃叠甲。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前召手下；调高更早进入防守姿态，调低只在濒危时才召。"
        })
    ]);
}
