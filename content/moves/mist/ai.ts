/**
 * 白雾 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、自己还没被雾罩住（已有足够保护就不再重复张），且它在 ai.maxChase 以内；
 *   ai.opening=受压时张雾（默认）只在对手正攻击自己或主人、或自己刚被打过时张；
 *   =随时时见威胁就先罩上，当常备防御。
 * 对谁出手：自己；雾会以自身为锚顺手把队友一起罩住，所以不需要选中队友。
 * 候选之间怎么排：身边有友方还没被雾罩住时排得更前——张雾是为了护住这一片；
 *   已有友方真的带着负等级（实际发生过的降级）时略高（58），否则保守的 54；只剩自己需要时 48。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 放完之后：雾替自己与队友吞掉外来的能力下降（自己招式自愿付的降级不在此列），交回共享顺序继续战斗；
 *   雾还在时不再重复，离开雾圈的人随补给停止失去。
 * 配置 veil（浓雾／薄雾）改变半径、时长与节奏；ai.maxChase、ai.opening 决定追多远、什么时候张雾。
 */
namespace PokemonSkills {
    /** 只读事实：半径内是否已经有友方真带着负等级——这是实际发生过的降级，不是从招式表猜出来的威胁。
     *  变化招式数量也含回复/强化，不能当作降级来源；普通 MC 有害药水属于神秘守护要挡的异常，不是白雾。 */
    function mistDowngraded(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            const stages = CompanionBehavior.stages(context, other);
            for (const name in stages) if (stages[name] < 0) return true;
        }
        return false;
    }
    function mistAllyExposed(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            if (!CompanionBehavior.status(context, other, mistStatus)) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(mistId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, mistStatus)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") !== "incoming") return true;
            const owner = context.facts.owner;
            return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) {
            if (!mistAllyExposed(context)) return 48;
            // 保守权重：护住这一片本身就有价值，已知有降级在身时略高；不把普通「受伤」当成降级威胁。
            return mistDowngraded(context) ? 58 : 54;
        }
    });

    addPreferences(mistId, { ai: { maxChase: 14, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑张雾；调小只在贴身受压时张，调大在更远处就先准备好。" }),
        choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时张雾", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
