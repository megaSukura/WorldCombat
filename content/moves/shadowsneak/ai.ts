/**
 * 影子偷袭 / shadowsneak 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内。它是全族最便宜的先制起手，
 *   走地面、不需要视线，所以够得着就愿意先摸一下；更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.preferBack`（默认开）时，目标正忙着打别人（它的背面朝着自己）多一档分——这正是从背后下手的时机。
 * 优先次序：射程内基础 20；目标矛头对着别人 +8；残血且 `ai.finish` 开 +16；目标刚起身/站着不动按普通价。
 * 够不到怎么办：射程由 `reach` 决定，共享任务把身位收进影子长度后再下刀。
 * 放完之后：目标被拽近一步、裹足式还被减速；交回共享交战计划，适合接一记近身重招。
 */
namespace PokemonSkills {
    function shadowsneakWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
    }

    CompanionBehavior.registerUse(shadowsneakId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return shadowsneakWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !shadowsneakWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 20;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferBack", true) && target.attacking && target.attacking !== self.ref) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 16;
            return score;
        }
    });

    addPreferences(shadowsneakId, {}, [
        field(pathOf("tether"), "裹足式", "boolean", {
            help: "开启：影子缠住对手的脚，命中降一级速度、拖拽强 60%，把人更狠地拉进怀里；代价是这一刺轻一成二、影子短 0.6 格、冷却多 4 刻。关闭（背刺式）：更长、更重、回得更快，但没有减速。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才主动伸影子；本招比音速拳远得多，设大愿意从更外面先手。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一刀；关闭：只按普通先制候选排序。"
        }),
        field(pathOf("ai.preferBack"), "专挑背身", "boolean", {
            help: "开启：目标正忙着打别人（背朝自己）时优先下手，读起来更像从背后偷袭；关闭：不区分目标朝向。"
        })
    ]);
}
