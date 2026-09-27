/**
 * 二连击 / doublehit —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带二连击的伙伴把它当**身前扇面的来回两扫**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 9）以内就出手；更远交给共享接近逻辑。
 * 为什么对扎堆出手：这一招的弧很宽、能同时扫到好几个。收益按**本招实际 reach 与张角**数出的扇面人数估算
 *   （`ai.crowd` 默认开）；墙挡住的目标不计入，与命中同源。第一扫会把人沿扫动方向推开 push 格，所以只有
 *   目标在推走后仍留在射程内时，才按"回程还够得到"略微加分——避免第一推送出回程却仍按双中估分。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两扫各自结算，第一扫把人扫开、第二扫回拍；伙伴交回共享顺序。
 * 抗推目标：受击位移走原生 `hitDisplace`，所以 Boss/高击退抗性目标照常吃两扫原伤，只是不会被硬移位置。
 * 优先级：基础 24（在射程内）／6（还要先走近）；人群每多一个 +9（封顶 +18），回程仍够得到时 +4。
 */
namespace CompanionBehavior {
    function doublehitWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 9);
    }

    /** 用本个体真实配置求一项参数；缺省时退回给定值。 */
    function doublehitValue(context: WorldBehavior.Context, item: WorldBehavior.Capability, key: string, fallback: number): number {
        const world = CompanionBehavior.world(context);
        const value = PokemonSkills.p("doublehit", key, { world: world, actor: world.source(), detail: { values: item.data.config } });
        return typeof value === "number" && isFinite(value) ? value : fallback;
    }

    /** 本招实际射程：动作已解析的 range 优先。 */
    function doublehitReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        return typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : doublehitValue(context, item, "reach", 3.4);
    }

    /** 以自己朝目标方向铺出本招实际张角的扇面，数出真正会被扫到、且没被实心墙挡住的非友方。 */
    function doublehitCoverage(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), delta = CompanionBehavior.point(target.point).minus(from);
        if (delta.length() < 0.05) return 1;
        const region = WorldGeometry.sector(from, delta, doublehitReach(context, item), doublehitValue(context, item, "span", 150), { below: 2.5, above: 2.5 });
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const point = CompanionBehavior.point(other.point);
            if (!region.contains(point)) continue;
            if (WorldGeometry.blockHit(world, from, point) !== null) continue;
            count++;
        }
        return count + 1;
    }

    /** 第一扫按 push 推走后，目标是否还留在射程内——决定"回程还够得到"是否成立。 */
    function doublehitReturnStays(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        const self = CompanionBehavior.source(context);
        const push = doublehitValue(context, item, "push", 0.7);
        return distance(self.point, target.point) <= Math.max(0.5, doublehitReach(context, item) - push);
    }

    registerUse("doublehit", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return doublehitWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !doublehitWants(context, item, target)) return 0;
            if (distance(source(context).point, target.point) > item.data.range) return 6;
            let score = 24;
            if (ai<boolean>(item, "crowd", true)) {
                const coverage = doublehitCoverage(context, item, target);
                score += Math.min(18, Math.max(0, coverage - 1) * 9);
                if (coverage >= 2 && doublehitReturnStays(context, item, target)) score += 4;
            }
            return score;
        }
    });

    PokemonSkills.addPreferences("doublehit", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("arc"), "回扫", "boolean", {
            help: "开启（回扫）：尾巴沿身前扇面来回两扫，第一扫朝一侧、回扫反走同弧朝另一侧，张角 ×1.1、横向推力 ×1.2，把人推来推去；代价是每扫 ×0.9。关闭（直扫）：两扫同向、张角 ×0.62 更窄更集中、每扫 ×1.15，沿同一个方向一路把人推出去。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动甩尾，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启：目标近旁还站着别的敌人时更愿意甩尾，因为宽弧能一次扫到好几个；关闭则只按普通近身攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为甩尾离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
