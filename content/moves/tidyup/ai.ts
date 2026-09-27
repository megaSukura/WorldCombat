/**
 * 大扫除 / tidyup 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：先算**净收益**——这片场地里别人留下的陷阱或替身扫掉就是收益（priority 108）；
 *   但这一扫不分敌我，混着自己布置时，只有敌方布置的价值严格超过当前己方布置的损失才自动清，
 *   等于或亏就不因「有东西」把辛苦布下的替身／陷阱一起收走（priority 0）。
 *   两边都没有时，有威胁才把它当整备招抬攻速（priority 100）。
 * 什么时候最想出手：敌方布置在范围内时抢在共享交战次序前扫掉，即使身上已有轻快、只要出现新的敌方布置仍会再扫；
 *   没有敌方布置时才是纯整备，已经在轻快窗口里就不再重复。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：敌方布置被收走、攻与速抬起来；窗口内不再重复，窗口走完才重新考虑。
 * 检测用只读、决策内缓存的事实探针，半径取本招当前的实际清扫参数（含「广扫」），够不到的不算；
 *   归属取陷阱/替身自己的真实位置与归属者，不把近处 helper 的远主人所有替身一起算进来。
 */
namespace PokemonSkills {
    /** 本招当前的实际清扫半径：用行动携带的偏好配置求值，和真正施放时一致。 */
    function tidyupSweep(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.5, p(tidyupId, "sweep", { world: world, actor: world.source(), detail: { values: capability.data.config } }));
        } catch (error) {
            return tidyupReference;
        }
    }

    /**
     * 只读、决策内缓存：范围内按归属分组、按分量加权的可清价值；半径取本次实际清扫范围，够不到的不算。
     * 替身花生命才立得起来、比一层场地陷阱更重；同一权重同时用于「清掉敌方的收益」与「损失己方的代价」。
     */
    function tidyupHazardWeight(): number { return 1; }
    function tidyupWardWeight(): number { return 2; }

    function registerTidyupValue(id: string, foreign: boolean): void {
        CompanionBehavior.registerFact(id, function (access: CombatWorld, actor: CombatActor, argument: any): number {
            const body = access.observe(actor);
            if (body === null) return 0;
            const centre = body.position(), reach = typeof argument === "number" && isFinite(argument) ? argument : tidyupReference;
            let value = 0;
            const hazards = tidyupHazardsNear(access, centre, reach);
            for (let index = 0; index < hazards.length; index++) if (hazards[index].foreign === foreign) value += tidyupHazardWeight();
            const wards = tidyupWardsNear(access, centre, reach);
            for (let index = 0; index < wards.length; index++) if (wards[index].foreign === foreign) value += tidyupWardWeight();
            return value;
        });
    }
    registerTidyupValue("world_combat:move_tidyup/foreign", true);
    registerTidyupValue("world_combat:move_tidyup/own", false);

    function tidyupForeignValue(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_tidyup/foreign", CompanionBehavior.source(context), tidyupSweep(context, capability));
        return typeof value === "number" ? value : 0;
    }

    function tidyupOwnValue(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_tidyup/own", CompanionBehavior.source(context), tidyupSweep(context, capability));
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(tidyupId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            const foreign = tidyupForeignValue(context, capability), own = tidyupOwnValue(context, capability);
            // 净收益严格为正（敌方布置价值超过己方布置损失）才自动清场；没有己方损失时任何敌方布置都算净收益。
            if (foreign > own) return true;
            if (CompanionBehavior.status(context, self, "tidyup")) return false;
            // 有己方布置、清掉是净损失：不拿整备当理由拆自己的场。
            if (own > 0) return false;
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            return CompanionBehavior.distance(self.point, threat.point) >= CompanionBehavior.ai<number>(capability, "minGap", 2);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const self = CompanionBehavior.source(context);
            const foreign = tidyupForeignValue(context, capability), own = tidyupOwnValue(context, capability);
            if (foreign > own) return 108;
            if (CompanionBehavior.status(context, self, "tidyup")) return 0;
            if (own > 0) return 0;
            return context.senses["world_combat:threat"] ? 100 : 0;
        }
    });

    addPreferences(tidyupId, {}, [
        field(pathOf("ai.maxChase"), "扫除距离", "number", {
            min: 3, max: 24, step: 1,
            help: "敌方布置的价值超过己方布置的损失时才自动清场；两边都没有时，威胁进入这个距离内才当整备招；越大越早把攻速垫起来。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再扫、直接应对；调大更常在近身时放弃整备。"
        })
    ]);
}
