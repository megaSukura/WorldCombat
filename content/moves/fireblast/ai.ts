/**
 * 大字爆炎 / fireblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 17）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时残血目标排前，用这一记高威力特殊火收尾；已经带着共享灼伤
 *   身份的目标排后（再点一次意义不大）。评分按「预计三笔覆盖」——用本招真实的字大小与笔画厚度搭出三笔，
 *   数目标当刻身体碰到几笔；再按成字延迟（三笔分次点亮）对走位中的目标压价，对站定的目标加分。
 *   刻印式再偏向**慢而大的目标**——它们更容易停留在贴地的字笔上，并用真实脚底地材判断能不能留字。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记高威力单体火，刻印式还会把字贴在地上；交回共享交战计划。
 */
namespace PokemonSkills {
    function fireblastWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    /** 按本招真实公式（字大小、笔画厚度）在目标当刻位置搭出三笔，数身体碰到几笔；只看「预计三笔覆盖」。 */
    function fireblastCoverage(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const values = { world: world, actor: world.source(), skill: skills["fireblast"], detail: { values: capability.data.config || {} } };
        const glyph = p("fireblast", "glyph", values), radius = p("fireblast", "radius", values);
        const aim = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(aim.minus(CompanionBehavior.point(self.point)));
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const shape = fireblastGlyph(aim, side, WorldCombat.point(0, 1, 0), glyph);
        const entity = world.actor(target.ref), body = entity ? world.observe(entity) : null;
        if (!body) return 0;
        const min = body.boundsMin(), max = body.boundsMax(), segments = [shape.bar, shape.left, shape.right];
        let hits = 0;
        for (let i = 0; i < segments.length; i++)
            if (WorldGeometry.bodySegment(segments[i][0], segments[i][1], radius).intersects(min, max)) hits++;
        return hits;
    }

    CompanionBehavior.registerUse("fireblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return fireblastWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !fireblastWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 14;
            if (CompanionBehavior.status(context, target, "burn")) score -= 7;
            const config: any = capability.data.config || {};
            // 预计三笔覆盖：目标当刻身体碰到几笔；落在笔画空隙或只擦到边说明这一发收益低。
            const coverage = fireblastCoverage(context, capability, target);
            score += coverage >= 2 ? 8 : coverage === 1 ? 3 : -5;
            // 成字延迟：三笔分次点亮，快速走位的目标容易走出三笔；站定的目标留得住。
            let pace = 0;
            const velocity = CompanionBehavior.velocity(context, target);
            if (velocity) pace = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
            if (pace < 0.05) score += 6; else if (pace > 0.12) score -= 6;
            if (config.inscribe === true) {
                // 刻印靠真实脚底路线：脚下有可达地材才值得留字，慢而大的目标更容易停在字笔上。
                const world = CompanionBehavior.world(context), entity = world.actor(target.ref), body = entity ? world.observe(entity) : null;
                const floor = body ? SurfacePaths.support(world, WorldCombat.point(body.position().x(), body.boundsMin().y(), body.position().z()), 1, 2) : null;
                if (!floor) score -= 10; else score += 4;
                if ((target.width || 0.9) * (target.height || 1.4) >= 2.0) score += 4;
            }
            return Math.max(1, score);
        }
    });

    addPreferences("fireblast", {}, [
        field(pathOf("inscribe"), "刻印式", "boolean", {
            help: "开启：崩字威力 ×0.85，但余字贴地、只有发烫的笔画带反复烫站在上面的人（字间空隙安全），冷却 +10 刻，用来封地。关闭（爆燃式）：威力 ×1.15、一记更重、冷却更短，代价是字不留地。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 24, step: 1,
            help: "超过这个距离就不主动写字，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这记高威力大字收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
