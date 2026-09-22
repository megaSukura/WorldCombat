/**
 * 狂舞挥打 / brutalswing 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、360° 覆盖的近距扫场。`available` 要求有可见、敌对、存活且落在
 *   `ai.maxChase`（默认 8）格内的目标；空中的对手也会被这一圈扫到（不筛 grounded）。
 *   `ready` 要求身边 `ai.minFoes`（默认 1）格内至少站着这么多可见敌人——它可以只对一个人转，也可以
 *   被围住时一次扫一圈；把人数调高就只在人群里才转。
 * 对谁出手：谁的优先度取决于身边挤着多少人，不区别目标身份。
 * 够不到怎么办：reach 就是本招半径，共享接近逻辑先把身位送进人堆。
 * 放完之后：扫过的人各带一次伤害与被甩开的位移；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function brutalswingCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(capability, "maxChase", 8);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function brutalswingWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    CompanionBehavior.registerUse("brutalswing", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false
                && brutalswingCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return brutalswingWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !brutalswingWants(context, capability, target)) return 0;
            const count = brutalswingCount(context, capability);
            let score = 15;
            if (count >= 3) score += Math.min(24, (count - 2) * 8);
            return score;
        }
    });

    addPreferences("brutalswing", {}, [
        field(pathOf("wide"), "广抡式", "boolean", {
            help: "开启：横扫半径 ×1.18、扫飞更远、胳膊伸得更开，代价是单发威力 ×0.85、转身与收招各多 3 刻、冷却 +6 刻。关闭（紧抡式）：贴得更近转得更短更快、单发更重，但甩不动、够不到稍远的人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑横扫；调小只在贴身时转，调大愿意先追进人堆再扫。"
        }),
        field(pathOf("ai.minFoes"), "扫到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "半径内至少站着这么多可见、敌对的敌人才转；调大只被围住时用，调 1 见一个也转。"
        })
    ]);
}
