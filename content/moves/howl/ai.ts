/**
 * 长嚎 的伙伴 AI 用途：这是这招自己的一套出手计划——把整群伙伴的气势抢先吼起来。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内、自己身上还没有斗志时先吼一轮；身边暂时安全时（驻守／自主／工作）也吼。
 * 什么时候最想出手：群嚎且身边有伙伴时 priority 92——先把全队物攻抬起来再进交战；威胁还在 ai.minGap 之外时 88，
 *   正好在接近前把斗志备好；已经贴脸时 40，退到普通次序，不为强化站着挨打。
 * 对谁出手：自己；嗥声会以自身为锚顺手把队友一起吼起来，所以不需要选中队友。
 * 够不到怎么办：不需要够——由共用任务直接施放；威胁太远就先不吼，等它靠近再评估。
 * 放完之后：攻击已经抬起、身上挂着斗志窗口；窗口还在时不再重复，交回共享交战计划。
 */
namespace CompanionBehavior {
    const howlMaxChase = PokemonSkills.number("ai.maxChase", "集结距离", 4, 24, 1);
    howlMaxChase.help = "威胁进入这个距离内才考虑先吼一轮；越大越早开始集结。";
    const howlMinGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1);
    howlMinGap.help = "威胁近于这个距离时不再优先集结、直接应战；调大更常在近身时放弃吼。";

    PokemonSkills.addPreferences("howl", { cry: 1, ai: { maxChase: 14, minGap: 3 } }, [howlMaxChase, howlMinGap]);

    function howlAllyNear(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.ref !== self.ref
                && CompanionBehavior.distance(other.point, self.point) <= radius) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("howl", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "howl")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            const pack = Number(capability.data.config.cry) === 1;
            if (pack && howlAllyNear(context, 6)) return 92;
            return gap < CompanionBehavior.ai<number>(capability, "minGap", 3) ? 40 : 88;
        }
    });
}
