/**
 * 顺风 的伙伴 AI 用途：这是这招自己的一套出手计划——把整队托快，而不是只给自己叠加。
 *
 * 什么局面有意义：场上有看得见的威胁；自己身上还没有同一份风；身边 `reach` 以内至少有一位伙伴（不然单托自己不值一次 PP 15）。
 * 什么时候最想出手：威胁还在 ai.minGap 之外（还没贴身）时 priority 100 抢在共享交战次序前先把全队拉快；
 *   已经贴身（小于 minGap）就让位给普通攻击，不为起风站着挨打。
 * 对谁出手：以自身为锚起风，身边同伴顺势被托住；共享的 partner 观测只用来确认「附近确实有人要托」。
 * 放完之后：速度已写进公共能力阶梯；风速窗口内不重复起风，窗口走完才重新考虑。
 */
namespace CompanionBehavior {
    const tailwindChase = PokemonSkills.number("ai.maxChase", "起风距离", 3, 26, 1);
    tailwindChase.help = "威胁进入这个距离内才考虑起风；越大越早开始。";
    const tailwindGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1);
    tailwindGap.help = "威胁近于这个距离时不再起风、直接应对；调大更常在近身时放弃提速。";

    PokemonSkills.addPreferences("tailwind", { gale: 1, ai: { maxChase: 12, minGap: 3 } },
        [tailwindChase, tailwindGap]);

    /** 身边 reach 以内有几位活着的伙伴（含自己不算）。 */
    function tailwindCompany(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.ref !== self.ref
                && CompanionBehavior.distance(other.point, self.point) <= radius) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("tailwind", {
        protocols: ["world_combat:bolster"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "tailwind")) return false;
            const radius = capability.data.range;
            if (!tailwindCompany(context, radius)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            return target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, _target) {
            const self = CompanionBehavior.source(context);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 60;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 0 : 100;
        }
    });
}
