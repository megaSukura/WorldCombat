/**
 * 戏法防守 的伙伴 AI 用途：这是这招自己的一套出手计划——在对手真的用起变化招式、或队友已被异常拿捏时织起符阵。
 *
 * 什么局面有意义：有可见威胁、自己还没被符阵罩住、且它在 ai.maxChase 以内。默认 ai.opening=受压时织阵，只在
 *   确有变化压力时织：本单元的观察点见过某个敌人出手变化招式，或附近友方身上已经带着关键异常；威胁正扑向某个
 *   友方（即将挨招）也算一拍。=随时时见威胁就先织上，当常备防御。只看敌人在附近不织阵，没法预判时留给玩家手动。
 * 对谁出手：自己；符阵会以自身为锚顺手把队友一起罩住，所以不需要选中队友。
 * 候选之间怎么排：身边有友方还没被符阵罩住时排得更前（58）——织阵是为了护住这一片；
 *   只剩自己需要时 48；0 或负值仍可由共享顺序兜底选中。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 放完之后：符阵替自己与队友挡下敌方变化招式，交回共享顺序继续战斗；阵还在时不再重复，拨挡次数用尽即收。
 */
namespace CompanionBehavior {
    /** AI 眼里算「关键异常」的共享身份：真的落到队友头上就值得张阵。 */
    const craftyKeyStatuses = ["paralysis", "burn", "poison", "toxic", "sleep", "frozen", "confusion"];

    /** 附近友方（含自己）是否已经带着关键异常。 */
    function craftyShieldAllyAfflicted(context: WorldBehavior.Context, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        function afflicted(other: CompanionBehavior.Entity): boolean {
            for (let i = 0; i < craftyKeyStatuses.length; i++) if (CompanionBehavior.status(context, other, craftyKeyStatuses[i])) return true;
            return false;
        }
        if (afflicted(self)) return true;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= radius && afflicted(other)) return true;
        }
        return false;
    }

    /** 已见敌用状态干扰：附近任一敌人最近真的出手过变化招式（本单元观察点记录）。 */
    function craftyShieldStatusPressure(context: WorldBehavior.Context, radius: number): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (PokemonSkills.craftyShieldStatusSeen(other.ref, world.tick(), 200)) return true;
        }
        return false;
    }

    /** 威胁是否正扑向自己或附近的某个友方——变化招式多半也是这么递过来的，算「即将承关键异常」。 */
    function craftyShieldImminent(context: WorldBehavior.Context, threat: CompanionBehavior.Entity, radius: number): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        if (threat.attacking === self.ref) return true;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (threat.attacking === other.ref) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("craftyshield", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "craftyshield")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const chase = CompanionBehavior.ai<number>(capability, "maxChase", 13);
            if (CompanionBehavior.distance(self.point, threat.point) > chase) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") !== "incoming") return true;
            return craftyShieldStatusPressure(context, chase) || craftyShieldAllyAfflicted(context, chase)
                || craftyShieldImminent(context, threat, chase);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) { return craftyShieldAllyExposed(context) ? 58 : 48; }
    });

    function craftyShieldAllyExposed(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            if (!CompanionBehavior.status(context, other, "craftyshield")) return true;
        }
        return false;
    }

    PokemonSkills.addPreferences("craftyshield", { weave: 1, ai: { maxChase: 13, opening: "incoming", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时织阵", "随时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
