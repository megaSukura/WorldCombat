/**
 * 喷出 / spitup 的 AI 用途。
 *
 * 什么局面下出手：**必须已经带着蓄力层数**（共享身份 world_combat:status/stockpile），否则这一招没有任何意义——
 *   `available` 在拿不到层数时直接不选它。层数少于 `ai.minLayers` 时也先不放，等蓄到够多再一次吐出去。
 * 对谁出手：可见、敌对、存活且在 `ai.maxChase` 内的目标；直喷式当远程单体重弹用，喷散式在目标成群时更值。
 *   priority 读本个体**实际配置**的喷散角度与射程，数出这一片锥形真实可达（未被墙挡住）的敌人数再加分。
 * 值不值得现在吐：层数同时是防御与特防加成，一次交光护盾有生存成本；伙伴血越少，这份成本越压过重击收益，
 *   所以不会一律「层数越多越立刻吐」。
 * 放完之后：层数一次放空、防护等级一起交出去，所以 AI 放完这口会回到共享交战秩序；等蓄力再攒起来才会再考虑喷出。
 * 层数由本单元自己注册的探针读取共享身份（不依赖蓄力单元的探针是否已加载）；拿不到时按「至少 1 层」处理，
 * 保证这招在只装了本单元的场面里也放得出来。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_spitup/layers", function (access, actor, _argument) {
        return spitupLayers(access, actor);
    });

    /** 本个体实际配置的喷散扇面能罩到的可见非友方数量；角度与射程读同一份配置，再用真实墙面排掉墙后的。 */
    function spitupSprayCount(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), aim = CompanionBehavior.point(target.point).minus(from);
        if (aim.length() < 0.05) return 1;
        const source = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const reach = Math.max(4, p(spitupId, "reach", source) * 0.72);
        const degrees = Math.max(30, p(spitupId, "spread", source));
        const region = WorldGeometry.sector(from, aim, reach, degrees);
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const point = CompanionBehavior.point(other.point);
            if (!region.contains(point)) continue;
            if (WorldGeometry.blockHit(world, from, point) !== null) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(spitupId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (!CompanionBehavior.status(context, self, "stockpile")) return false;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_spitup/layers", self);
            if (layers !== null && layers < CompanionBehavior.ai<number>(capability, "minLayers", 1)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(self.point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_spitup/layers", self) || 1;
            const spray = !!(capability.data.config && capability.data.config.spray === true);
            // 基础价值随这一口的重量上升，但不无限叠加：层数不是越多越该立刻吐。
            let score = 18 + Math.min(3, layers) * 5;
            // 层数同时也是防御与特防加成：血越少，一次交光护盾的生存成本越高，越该先缓一缓。
            if (layers >= 2) score -= Math.round((1 - CompanionBehavior.ratio(self)) * (layers - 1) * 4);
            // 喷散式一次罩住一片，按实际可达敌人数加分；直喷式是单点重弹，保持普通远程交战排序。
            if (spray) score += Math.min(20, Math.max(0, spitupSprayCount(context, capability, target) - 1) * 8);
            return Math.max(6, score);
        }
    });

    addPreferences(spitupId, {}, [
        field(pathOf("spray"), "喷散式", "boolean", {
            help: "开启：把这一口摊成身前一整片锥形，一次罩住多个敌人，射程更近但更省更快，代价是每个目标威力 ×0.68。关闭：直喷式，一发沿直线飞出的重弹，单点威力最高、射程最远。"
        }),
        field(pathOf("ai.maxChase"), "喷出距离", "number", {
            min: 2, max: 24, step: 1,
            help: "目标超过这个距离就不吐，先走近。越大越会当作远程攻击从远处放，也越容易在起手时被躲开。"
        }),
        field(pathOf("ai.minLayers"), "蓄到几层才放", "number", {
            min: 1, max: 3, step: 1,
            help: "层数低于这个值就先不放，回去继续蓄力。调高更贪、等更重的发射；调低则一有两层就吐出去。层数同时提供防御与特防加成，伙伴受伤时会把这份生存成本算进去，不总以层数越多越立刻吐。"
        })
    ]);
}

