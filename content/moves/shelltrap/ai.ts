/**
 * 陷阱甲壳 / shelltrap 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见威胁、生命高于 `ai.minHealth`（默认 0.35）、身上还没在撑壳、且威胁进入
 *   `ai.range`（默认 5）以内时撑壳——壳要被物理打中才有意义，所以要在对手贴得够近时撑。
 *   普通壳还要对面像在用物理近战（或已经冲着我们出手）；只有感应壳才对远程/特殊威胁同样撑起。
 *   自己血量太低时不开（撑壳期间站定，血太少只会白送）。
 * 对谁出手：只有自己（kind self），reach 0；壳炸开时自动打向身周所有非友方。
 * 优先级：威胁已经贴身时抬到 85 抢在共享交战次序前撑好；其余 30。撑壳期间站定，是「请君入瓮」的取舍。
 * 放完之后：被物理打中就当场炸开，动作结束；一段窗口都没被物理打中则收壳落空。不重复撑壳。
 * 配置：`hairtrigger`（感应壳）把触发放宽到任何敌对命中、代价是威力与窗口更小；
 *   `ai.range` 决定威胁进多近才撑；`ai.minHealth` 决定血低到什么程度就不撑。
 */
namespace PokemonSkills {
    /** 普通壳只在对面像物理近战（攻 ≥ 特攻）或已经在打我们时才撑；读不到数据的身体按近战算。 */
    function shelltrapPhysicalThreat(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        if (threat.attacking === CompanionBehavior.source(context).ref) return true;
        const facts = CompanionBehavior.combatStats(context, threat), stats = facts && facts.stats;
        if (!stats) return true;
        const atk = Number(stats.atk), spa = Number(stats.spa);
        if (!isFinite(atk) || !isFinite(spa)) return true;
        return atk >= spa;
    }

    /** 够近，且（感应壳，或对面是物理近战/正在打我们）才值得撑壳。 */
    function shelltrapWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "range", 5)) return false;
        const hairtrigger = !!(capability.data.config && capability.data.config.hairtrigger === true);
        return hairtrigger || shelltrapPhysicalThreat(context, threat);
    }

    CompanionBehavior.registerUse("shelltrap", {
        protocols: ["world_combat:survive"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "shelltrap")) return false;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.35)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return shelltrapWants(context, capability, threat);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            return shelltrapWants(context, capability, threat) ? 85 : 30;
        }
    });

    addPreferences("shelltrap", { hairtrigger: false, ai: { range: 5, minHealth: 0.35 } }, [
        field(pathOf("hairtrigger"), "感应壳", "boolean", {
            help: "开启：任何敌对命中都能点着壳（不再只认物理），代价是爆炸威力约 ×0.75、撑壳时长约 ×0.8、冷却 +6 刻，用来对付特殊攻击者。关闭：只被物理点着，威力与窗口都更足。"
        }),
        field(pathOf("ai.range"), "撑壳距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才撑壳。越大越早撑好，越可能空撑；越小越省，但要赌对手会贴上来打你。普通壳只在这种物理近战已经贴身时撑，感应壳才对远程威胁同样适用。"
        }),
        field(pathOf("ai.minHealth"), "撑壳血量", "number", {
            min: 0.15, max: 0.8, step: 0.05,
            help: "生命比例高于这个值才撑壳。越大越保守、掉血就不撑；越小越敢赌，但血太少可能还没被点着就先倒。"
        })
    ]);
}
