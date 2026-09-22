/**
 * 落英缤纷 / petalblizzard 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、空中地面都割的落英旋风。`ready` 要求身周 `ai.maxChase`（默认 8）格内
 * 至少站着 `ai.minFoes`（默认 2）个可见、敌对的敌人——它是拿来一次割一圈的，只对一个目标转风不划算。
 * `available` 还要求目标在考虑距离内；它不挑目标站不站在地上（旋风卷的是整圈，空中的也会被卷到）。
 * 够不到交给共享接近逻辑；走到风暴半径以内就原地转起。
 */
namespace PokemonSkills {
    function petalblizzardCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 8);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function petalblizzardWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    CompanionBehavior.registerUse("petalblizzard", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && petalblizzardCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return petalblizzardWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !petalblizzardWants(context, capability, target)) return 0;
            let base = 17;
            const count = petalblizzardCount(context, capability);
            if (count >= 3) base += Math.min(24, (count - 2) * 8);
            return base;
        }
    });

    addPreferences("petalblizzard", {}, [
        field(pathOf("cyclone"), "回旋式", "boolean", {
            help: "开启：风暴收到约 0.72 倍、每阵约 ×1.28、多甩一阵、拽与甩都更猛，起手与冷却更长，用来把一撮人卷拢再重甩。关闭（广旋式）：风暴约 1.15 倍、每阵更轻、收手更快，用来一次罩一小片、追散开的目标。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑落英缤纷；调小只在贴身转风，调大愿意先追进去。"
        }),
        field(pathOf("ai.minFoes"), "卷到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "风暴半径内至少站着这么多可见、敌对的敌人才转风；调大只被围住时用，调 1 见一个也转。"
        })
    ]);
}
