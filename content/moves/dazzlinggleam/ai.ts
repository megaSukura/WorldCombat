/**
 * 魔法闪耀 / dazzlinggleam 的伙伴 AI 用途。
 *
 * 什么局面下出手：以自身为中心、空中地面一起闪的一次性整圈闪光。`ready` 要求身周**真实光浪半径**
 *   （`capability.data.range`，由体型/特攻/等级算出）以内、且与中心之间没有被墙挡住的可见敌人至少有
 *   `ai.minFoes`（默认 2）个——不再用固定的 9 格把远处够不到的人也数进来。`ai.maxChase` 只用于决定
 *   “愿意先追到多近再闪”，够不到交给共享接近逻辑；走进半径以内就原地闪。
 * 对谁出手：被贴身围住时更值；自己血量偏低时再抬一档，把身边人闪花、拉开距离。
 * 状态：目眩是否真的挂上由命中层的 apply 结果决定，控免目标照吃主伤——这里只按几何与被围程度出手，不预设状态一定成立。
 */
namespace PokemonSkills {
    /** 本招的真实波及半径；`ready` 的人数按它数，墙后的不算。 */
    function dazzlinggleamReach(item: WorldBehavior.Capability): number {
        return typeof item.data.range === "number" ? item.data.range : 3.4;
    }

    /** 真实半径内、可见、且与中心之间通视的非友方数量（墙上的人不凑数）。 */
    function dazzlinggleamReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const reach = dazzlinggleamReach(item);
        const world = CompanionBehavior.world(context);
        const actor = world.actor(self.ref);
        if (actor === null) return 0;
        const body = world.observe(actor);
        const centre = body === null ? CompanionBehavior.point(self.point) : body.position();
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) > reach) continue;
            if (!world.clear(centre, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    function dazzlinggleamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 9);
    }

    CompanionBehavior.registerUse("dazzlinggleam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && dazzlinggleamReachable(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return dazzlinggleamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !dazzlinggleamWants(context, capability, target)) return 0;
            let base = 20;
            const count = dazzlinggleamReachable(context, capability);
            if (count >= 3) base += Math.min(22, (count - 2) * 7);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.5) base += 8;
            return base;
        }
    });

    addPreferences("dazzlinggleam", {}, [
        field(pathOf("wide"), "散射式", "boolean", {
            help: "开启：光浪半径约 ×1.22、边缘更均匀、出手更慢，代价是威力约 ×0.88、目眩更短，用来一次扫到更多人。关闭（凝聚式）：威力约 ×1.14、目眩更久，半径收到约 ×0.82，用来把贴身的一两个目标闪得更狠。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑闪光、并愿意先追进去；实际能闪到的人数仍按真实光浪半径、且墙上的人不算。"
        }),
        field(pathOf("ai.minFoes"), "闪到人数", "number", {
            min: 1, max: 6, step: 1,
            help: "身周真实半径内至少站着这么多可见、未被墙挡住的敌人才闪；调大只被围住时用，调 1 见一个也闪。"
        })
    ]);
}
