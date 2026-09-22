/**
 * 点穴 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：自己或身边伙伴身上还没有这条通畅窗口；按自己时威胁在 ai.maxChase 内、还没贴身；
 *   按伙伴时伙伴在 ai.maxChase + 点穴距离内。默认配置允许按自己，所以独行时也能用。
 * 什么时候最想出手：自己身上没有正在被威胁压制（差距还在 ai.minGap 之外）时 priority 92，越过共享交战次序
 *   先补一项能力；给伙伴按压放在 68，先照顾自己再照顾别人。
 * 对谁出手：优先自己，其次最近的伙伴（共享「被帮扶对象」感官给出）；由共用服务走近到点穴距离内再按。
 * 放完之后：那项能力已写进公共能力阶梯；通畅窗口内不再重复，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("acupressure", {
        protocols: ["world_combat:fortify", "world_combat:bolster"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (!target) return true;
            if (!target.friendly || target.health <= 0) return false;
            if (CompanionBehavior.status(context, target, "acupressure")) return false;
            const slack = CompanionBehavior.distance(self.point, target.point) - CompanionBehavior.ai<number>(capability, "maxChase", 6);
            return slack <= capability.data.range;
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.health > 0 && !CompanionBehavior.status(context, target, "acupressure");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (String(target.ref) !== String(self.ref)) return 68;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 40;
            return CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2) ? 0 : 92;
        }
    });

    addPreferences("acupressure", {}, [
        field(pathOf("ai.maxChase"), "协助距离", "number", {
            min: 0, max: 20, step: 1,
            help: "伙伴离自己这个距离以内才考虑去点；调大愿意主动靠过去帮同伴按压。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再给自己点穴、直接应对；调大更常在近身时放弃强化。"
        })
    ]);
}
