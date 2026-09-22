/**
 * 芳香治疗 的伙伴 AI 用途：这是一片整队的净化香云，不是伤害招。
 *
 * 什么局面有意义：自己或附近的伙伴身上带着主异常之一。香云会停留并反复净化，所以它在异常出现的当下铺下即可。
 * 对谁出手：只有自己（kind self 的落点即自身位置），reach 0；香云以自身为心，伙伴必须站在 ai.scentReach 以内。
 * 什么时候最急：自己也被挂上异常时 priority 100；否则 50，等共享交战次序轮到准备动作再铺。
 * 够不到怎么办：AI 不追人；伙伴在 ai.scentReach 之外就先不铺（铺了也罩不到）。
 * 配置：dense（浓香／弥香）在参数层改变半径与停留；ai.cleanseCount 与 ai.scentReach 是这套出手计划自己的选项。
 */
namespace CompanionBehavior {
    const aromatherapyCleanseCount = PokemonSkills.number("ai.cleanseCount", "铺云门限", 1, 4, 1);
    aromatherapyCleanseCount.help = "至少这么多个伙伴（含自己）被异常缠住时才值得铺云；调到 1 一有人中招就铺，调高则等更多人一起中招、一片云罩一队。";
    const aromatherapyScentReach = PokemonSkills.number("ai.scentReach", "香云尺度", 2, 6, 1);
    aromatherapyScentReach.help = "队友离自己这个距离以内才把他算进香云；调小只在贴身时铺，调大愿意为稍远的伙伴铺云。";

    PokemonSkills.addPreferences("aromatherapy", { dense: false, ai: { cleanseCount: 1, scentReach: 4 } },
        [aromatherapyCleanseCount, aromatherapyScentReach]);

    function aromatherapyAfflicted(context: WorldBehavior.Context, within: number): number {
        const self = source(context), candidates: Entity[] = [self];
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.friendly && other.health > 0 && String(other.ref) !== String(self.ref) && distance(self.point, other.point) <= within)
                candidates.push(other);
        });
        let found = 0;
        candidates.forEach(function (target) {
            for (let index = 0; index < PokemonSkills.aromatherapyMalaise.length; index++)
                if (status(context, target, PokemonSkills.aromatherapyMalaise[index])) { found++; return; }
        });
        return found;
    }

    registerUse("aromatherapy", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            return aromatherapyAfflicted(context, ai<number>(capability, "scentReach", 4)) >= ai<number>(capability, "cleanseCount", 1);
        },
        accepts: function (context, _capability, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, capability) {
            const self = source(context);
            let own = false;
            for (let index = 0; index < PokemonSkills.aromatherapyMalaise.length; index++)
                if (status(context, self, PokemonSkills.aromatherapyMalaise[index])) { own = true; break; }
            if (!aromatherapyAfflicted(context, ai<number>(capability, "scentReach", 4))) return 0;
            return own ? 100 : 50;
        }
    });
}
