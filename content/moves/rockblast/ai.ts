/**
 * 岩石爆击 / rockblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 9）格之内；更远交给共享接近逻辑。
 *   它靠一梭石块堆伤害、石块抛得散，贴脸才吃得满，所以偏好中近距离。
 * 对谁出手：大体型的近敌最划算（宽目标多吃几块），目标站在比自己低一层时更值（弧线更容易压到），
 *   对面扎堆（目标周围三格内还有别的敌人）也加分；反过来，远而小的目标会被压低。近身目标照常吃满。
 * 对 Boss：只有普通针伤/石伤照常结算，本招没有必须挂上的控制，所以不因为目标免疫减速而放弃。
 * 够不到怎么办：reach 就是本招射程，不够先走近；石块散开，目标若走位会被漏掉几块，这是设计的一部分。
 * 放完之后：这一梭抛完（或目标先倒）就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function rockblastWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    /** 目标的体型乘积（宽 × 高）；优先用决策帧已有事实，缺失时才读一次世界观察。 */
    function rockblastBulk(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const width = Number(target.width), height = Number(target.height);
        if (isFinite(width) && isFinite(height) && width > 0 && height > 0) return width * height;
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        const body = actor !== null ? world.observe(actor) : null;
        return body !== null ? body.width() * body.height() : 0;
    }

    CompanionBehavior.registerUse("rockblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return rockblastWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !rockblastWants(context, capability, target)) return 0;
            const source = CompanionBehavior.source(context).point;
            const distance = CompanionBehavior.distance(source, target.point);
            const bulk = rockblastBulk(context, target);
            let score = 16;
            if (distance <= capability.data.range) score += 4;
            if (distance <= 4) score += 6;
            if (bulk >= 3) score += 6;
            else if (bulk >= 1.6) score += 3;
            if (target.point[1] < source[1] - 0.5) score += 3;
            const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
            let cluster = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3) cluster++;
            }
            if (cluster >= 2) score += 3;
            if (distance > 6 && bulk < 1.6) score -= 5;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.45) score += 8;
            return Math.max(1, score);
        }
    });

    addPreferences("rockblast", {}, [
        field(pathOf("boulder"), "巨岩式", "boolean", {
            help: "开启：单石威力 ×1.4、石块更大、散布 ×0.6、弧更陡，适合打单个厚目标；代价是投石数收在 3、间隔 +2 刻、石速 ×0.92、起手 +3 刻、冷却 +5 刻。关闭（碎岩霰弹）：投石数可到 5 块、间隔更密、抛得更快，代价是单石威力 ×0.85、石块更小、散布 ×1.2。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动抛石，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一梭石块收尾；关闭则所有目标同价。"
        })
    ]);
}
