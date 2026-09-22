/**
 * 治愈铃声 的伙伴 AI 用途：这是一下整队的净化铃，不是伤害招，也不是自救招。
 *
 * 什么局面有意义：自己或半径内的伙伴身上带着主异常之一。它把「异常的个数」当作出手的理由——
 *   ai.cleanseCount 决定至少几个伙伴被缠住才值得响铃（默认 1，也就是一有人中招就响）。
 * 对谁出手：只有自己（kind self），reach 0；铃声以自身为心，队友必须站在 ai.chimeReach 以内。
 * 什么时候最急：自己也被挂上异常、或同时有 ≥2 个伙伴中招时 priority 100，抢在共享交战次序前先响铃；
 *   否则 45，等手里的动作告一段落再顺手净一次。
 * 够不到怎么办：AI 不自伤、不追人；队友在 ai.chimeReach 之外就先不响（响也洗不到）。
 * 配置：resonant（长鸣／短鸣）在参数层改变半径、声数与冷却；ai.cleanseCount 与 ai.chimeReach 是这套出手计划自己的选项。
 */
namespace CompanionBehavior {
    const healbellCleanseCount = PokemonSkills.number("ai.cleanseCount", "响铃门限", 1, 4, 1);
    healbellCleanseCount.help = "至少这么多个伙伴（含自己）被异常缠住时才值得响铃；调到 1 一有人中招就响，调高则等更多人一起中招、一次洗一队。";
    const healbellChimeReach = PokemonSkills.number("ai.chimeReach", "铃声尺度", 3, 10, 1);
    healbellChimeReach.help = "队友离自己这个距离以内才把他算进铃声；调小只在贴身时响，调大愿意为稍远的伙伴响铃。";

    PokemonSkills.addPreferences("healbell", { resonant: false, ai: { cleanseCount: 1, chimeReach: 6 } },
        [healbellCleanseCount, healbellChimeReach]);

    /** 半径内（含自己）有多少个战斗者带着主异常。 */
    function healbellAfflicted(context: WorldBehavior.Context, within: number): number {
        const self = source(context), candidates: Entity[] = [self];
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.friendly && other.health > 0 && String(other.ref) !== String(self.ref) && distance(self.point, other.point) <= within)
                candidates.push(other);
        });
        let found = 0;
        candidates.forEach(function (target) {
            for (let index = 0; index < PokemonSkills.healbellMalaise.length; index++)
                if (status(context, target, PokemonSkills.healbellMalaise[index])) { found++; return; }
        });
        return found;
    }

    registerUse("healbell", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            return healbellAfflicted(context, ai<number>(capability, "chimeReach", 6)) >= ai<number>(capability, "cleanseCount", 1);
        },
        accepts: function (context, _capability, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, capability) {
            const self = source(context);
            let own = false;
            for (let index = 0; index < PokemonSkills.healbellMalaise.length; index++)
                if (status(context, self, PokemonSkills.healbellMalaise[index])) { own = true; break; }
            const afflicted = healbellAfflicted(context, ai<number>(capability, "chimeReach", 6));
            if (!afflicted) return 0;
            return own || afflicted >= 2 ? 100 : 45;
        }
    });
}
