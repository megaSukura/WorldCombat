/**
 * 治愈铃声 的伙伴 AI 用途：这是一下整队的净化铃，不是伤害招，也不是自救招。
 *
 * 什么局面有意义：自己或半径内的伙伴身上带着有害状态效果之一。它把「异常的个数」当作出手的理由——
 *   ai.cleanseCount 决定至少几个伙伴被缠住才值得响铃（默认 1，也就是一有人中招就响）。
 * 对谁出手：只有自己（kind self），reach 0；铃声以自身为心，队友必须站在本次真实 chimeRadius 以内。
 * 什么时候最急：越多人被缠住越想响——自己中招额外加权，≥3 人一起中招时 priority 100，抢在共享交战次序前先响；
 *   一两个人时按人数落到 55–75，等手里的动作告一段落再顺手净一次。
 * 不重复抢放：刚响过铃的一小段时间里不再把它排到前面；已经被洗干净的伙伴不再计入，也就不会再为它抢放。
 * 够不到怎么办：AI 不自伤、不追人；队友在本次真实半径之外就先不响（响也洗不到）。声波可穿遮挡，所以不算视线。
 * 配置：resonant（长鸣／短鸣）在参数层改变半径、声数与冷却；ai.cleanseCount 是出手门限，
 *   ai.chimeReach 是愿意响铃的最大尺度，但永远不会超过本次真实 chimeRadius（公式给多少就是多少）。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_healbell/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    const healbellCleanseCount = PokemonSkills.number("ai.cleanseCount", "响铃门限", 1, 4, 1);
    healbellCleanseCount.help = "至少这么多个伙伴（含自己）被异常缠住时才值得响铃；调到 1 一有人中招就响，调高则等更多人一起中招、一次洗一队。";
    const healbellChimeReach = PokemonSkills.number("ai.chimeReach", "愿意响铃的尺度", 3, 10, 1);
    healbellChimeReach.help = "愿意为这个距离以内的伙伴响铃，但不会超过本次真实铃声半径；调小只在贴身时响，调大把更远的伙伴也算进来（仍以公式半径为准）。";

    PokemonSkills.addPreferences("healbell", { resonant: false, ai: { cleanseCount: 1, chimeReach: 6 } },
        [healbellCleanseCount, healbellChimeReach]);

    /** 本次配置实际敲出的铃声半径，与出招走的同一棵公式。 */
    function healbellRadius(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(2, PokemonSkills.p(PokemonSkills.healbellId, "chimeRadius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.healbellId],
                    detail: { values: capability.data.config || {} } }));
        } catch (error) { return 3.0; }
    }

    /** 真实半径内（含自己）有多少个战斗者带着有害状态效果；ai.chimeReach 只作为不超过半径的保守上限。 */
    function healbellAfflicted(context: WorldBehavior.Context, within: number): number {
        const self = source(context), candidates: Entity[] = [self];
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.friendly && other.health > 0 && String(other.ref) !== String(self.ref) && distance(self.point, other.point) <= within)
                candidates.push(other);
        });
        let found = 0;
        candidates.forEach(function (target) {
            if (fact<boolean>(context, "world_combat:move_healbell/harmful", target)) found++;
        });
        return found;
    }

    function healbellWithin(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        return Math.min(healbellRadius(context, capability), ai<number>(capability, "chimeReach", 6));
    }

    registerUse("healbell", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, capability) {
            if (context.facts.mounted) return false;
            return healbellAfflicted(context, healbellWithin(context, capability)) >= ai<number>(capability, "cleanseCount", 1);
        },
        accepts: function (context, _capability, target) { return String(target.ref) === String(source(context).ref); },
        priority: function (context, capability) {
            const self = source(context);
            const own = fact<boolean>(context, "world_combat:move_healbell/harmful", self) === true;
            const afflicted = healbellAfflicted(context, healbellWithin(context, capability));
            if (!afflicted) return 0;
            // 刚响过铃就不再抢下一次：给队友一点时间，等新异常再来。
            if (recent(context, "move", "healbell", 30)) return 0;
            let score = 40 + afflicted * 16;
            if (own) score += 24;
            if (afflicted >= 3 || own && afflicted >= 2) score = 100;
            return Math.min(100, score);
        }
    });
}
