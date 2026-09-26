/**
 * 鳞片噪音 / clangingscales 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、空中地面都震的一次性巨响。`ready` 要求身周**真实波及半径 `ringRadius`**
 *   内至少站着 `ai.minFoes`（默认 2）个可见、敌对、高度在带内且与自身通视的敌人——它起手长、会自降防御，
 *   是用来一次震开一圈的，只对一个目标放不划算，也不会让圈外/墙后的敌人凑数。`ai.maxChase` 只是考虑距离。
 * 对谁出手：目标是圈内威胁；不可见、友方或已倒下的不接受。
 * 够不到怎么办：reach 就是本招射程，不够先走近；走到波及半径以内就原地擦响。
 * 放完之后：命中才结算伤害与震退；无论命中与否都自降防御，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function clangingscalesCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const radius = item.data.range;
        const from = CompanionBehavior.point(self.point);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const to = CompanionBehavior.point(other.point);
            const delta = to.minus(from);
            if (delta.length() > radius) continue;
            if (delta.y() < -3.5 || delta.y() > 4.0) continue;
            if (!world.clear(from, to)) continue;
            count++;
        }
        return count;
    }

    function clangingscalesWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("clangingscales", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && clangingscalesCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return clangingscalesWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !clangingscalesWants(context, capability, target)) return 0;
            let base = 20;
            const count = clangingscalesCount(context, capability);
            if (count >= 3) base += Math.min(24, (count - 2) * 8);
            // 被围住时，一次震开一圈比继续硬拼更值。
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences("clangingscales", {}, [
        field(pathOf("echo"), "回响式", "boolean", {
            help: "开启：主震后隔一小段再荡一圈约 0.8 倍半径、45% 威力的二段声波，覆盖走出去的人；代价是自身防御多降一级、起手 +4 刻、收招 +4 刻、冷却 +8 刻。关闭（单响式）：一次干净利落的巨响，只降原生一级、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑鳞片噪音；调小只在贴身震，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "震到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "真实波及圈（按本个体的 ringRadius、高度带与通视复核）内至少站着这么多可见、敌对的敌人才擦响；圈外或墙后的不算。调大只被围住时用，调 1 见一个也震。"
        })
    ]);
}
