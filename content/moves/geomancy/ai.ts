/**
 * 大地掌控 / geomancy 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：蓄力期间立定不动、还要撑满 absorb 刻才拿增益，所以伙伴只在**对手还隔着一段距离**、
 *   自己没被睡冻时先扎地；移动中（骑乘）不扎。被睡冻时根本无法完成第二拍，直接放弃。
 * 什么时候最想出手：威胁在 ai.safeGap（默认 8）到 ai.maxChase（默认 22）之间时越过共享交战次序，
 *   赶在对手贴上来之前把两拍走完。priority 同时衡量「预计来袭」（威胁离安全线越远越有把握）与「剩余生命」
 *   （残血时只有威胁还远才敢赌）；已经进入蓄力时不再重复，被睡冻、离地或威胁已贴近 safeGap 时放弃。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特攻、特防、速度各 +2；交回共享交战计划，趁对手还没靠近把这些优势用出去。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("geomancy", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            // 站不住地面就扎不下去，别浪费一次长准备。
            if (context.facts.self && context.facts.self.grounded === false) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "sleep") || CompanionBehavior.status(context, self, "frozen")) return false;
            if (["spa", "spd", "spe"].every(function (stat) { return CompanionBehavior.stage(context, self, stat) >= 6; })) return false;
            if (CompanionBehavior.status(context, self, "geomancy")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            return gap >= CompanionBehavior.ai<number>(capability, "safeGap", 8)
                && gap <= CompanionBehavior.ai<number>(capability, "maxChase", 22);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "sleep") || CompanionBehavior.status(context, self, "frozen")) return 0;
            const safeGap = CompanionBehavior.ai<number>(capability, "safeGap", 8);
            const maxChase = CompanionBehavior.ai<number>(capability, "maxChase", 22);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < safeGap) return 0;
            // 预计来袭：威胁离安全线越远，越有把握走完两拍；已经逼近安全线的价值低。
            const lead = maxChase > safeGap ? Math.max(0, Math.min(1, (gap - safeGap) / (maxChase - safeGap))) : 1;
            // 剩余生命：血够时更愿意投这段长准备；残血时只有威胁还远才敢赌。
            const life = CompanionBehavior.ratio(self);
            let base = 96 + Math.round(lead * 18);
            if (life < 0.5) base += 12; else if (life > 0.8) base += 4;
            return Math.max(1, Math.min(120, base));
        }
    });

    addPreferences("geomancy", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 6, max: 30, step: 1,
            help: "威胁不超过这个距离才考虑扎地蓄力；调大愿意隔着更远先起手。"
        }),
        field(pathOf("ai.safeGap"), "安全距离", "number", {
            min: 3, max: 24, step: 1,
            help: "威胁近于这个距离时不再蓄力、直接交战；蓄力期间不能移动，调大更保守。"
        })
    ]);
}
