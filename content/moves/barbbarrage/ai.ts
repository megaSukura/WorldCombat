/**
 * 毒千针 / barbbarrage 的 AI 用途。
 *
 * 什么局面下出手：物理远程齐射，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 对谁出手：目标已中毒／剧毒时 priority 抬得最高——贴准它这一轮整轮翻倍、还把毒坐实；
 *   再用本招**实际的总张角与射程**做一次实体箱扇区，看扇面里是否盖到至少两个非友方身体，
 *   盖到多个就再加一档；不按目标附近 3 格内的球人数估计。不额外经营地面。
 * 够不到就交给共享接近逻辑。
 */
namespace PokemonSkills {
    /** 按本招实际总张角与射程、用真实实体箱判断扇面里是否盖到至少两个非友方身体（含目标本身）。 */
    function barbbarrageFanCrowded(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_barbbarrage/fan:" + target.ref, function () {
            try {
                const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
                const from = CompanionBehavior.point(self.point), goal = CompanionBehavior.point(target.point);
                const delta = goal.minus(from);
                if (delta.length() < 0.05) return false;
                const values = { world: world, actor: world.source(), detail: { values: capability.data.config } };
                const spread = Math.max(4, Math.min(360, p("barbbarrage", "spread", values)));
                const region = WorldGeometry.bodySector(from, delta, capability.data.range, spread);
                let count = 0;
                WorldGeometry.selectBodies(world, region, function (_actor, facts) { if (!facts.friendly()) count++; });
                return count >= 2;
            } catch (ignored) { return false; }
        });
    }

    CompanionBehavior.registerUse("barbbarrage", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const poisoned = CompanionBehavior.status(context, target, "poison") || CompanionBehavior.status(context, target, "toxic");
            let score = 22;
            if (poisoned) score += 18;
            if (barbbarrageFanCrowded(context, capability, target)) score += 6;
            const width = target.width === undefined ? 0.9 : target.width;
            if (width >= 1.4) score += 3;
            return score;
        }
    });

    addPreferences("barbbarrage", {}, [
        field(pathOf("hail"), "倾泻", "boolean", {
            help: "开启：针数 ×1.4、中毒概率 ×1.15，但整轮威力 ×0.85，收招与冷却各多 2／3 刻。关闭：针少而重，单体更痛。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动齐射，先走近。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
