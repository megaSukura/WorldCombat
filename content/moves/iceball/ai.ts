/**
 * 冰球 / iceball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 9）格以内；更远交给共享接近逻辑。
 * 对谁出手：宽阔通路里的大目标（Boss、大体型）优先——后几发球更粗也更重，越大越难躲开；
 *   起手前用只读空域探针 `CompanionBehavior.world(context).freeSpace` 沿瞄准线探一下身后那几发的球宽，
 *   狭窄门口后续大球会先撞门框，这时降一档，宁可靠近换角度。
 * 放完之后：施法者在这几秒里定住不动，是它最脆的窗口；碎开后会交回共享交战计划，带着冷却时不会重复推。
 */
namespace PokemonSkills {
    /** 沿准线往前探一段，看放得下后几发的球宽：窄门/夹缝返回 false。按决策帧缓存一次。 */
    function iceballOpen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_iceball/open:" + target.ref, function () {
            try {
                const world = CompanionBehavior.world(context);
                const self = CompanionBehavior.source(context);
                const from = self.point, dx = target.point[0] - from[0], dz = target.point[2] - from[2];
                const span = Math.sqrt(dx * dx + dz * dz);
                if (!(span > 1.5)) return true;
                const ux = dx / span, uz = dz / span, reach = Math.min(span - 0.6, 3.5);
                const width = Math.max(0.6, (self.width === undefined ? 0.9 : self.width) * 1.5);
                const probe = CompanionBehavior.point([from[0] + ux * reach, from[1], from[2] + uz * reach]);
                return world.freeSpace(probe, width, width);
            } catch (ignored) { return true; }
        });
    }

    CompanionBehavior.registerUse(iceballId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 23;
            const bulk = (target.width === undefined ? 0.9 : target.width) * (target.height === undefined ? 1.4 : target.height);
            if (bulk >= 2.0) score += 6;
            if (gap <= capability.data.range * 0.6) score += 4;
            if (!iceballOpen(context, target)) score -= 10;
            return Math.max(5, score);
        }
    });

    addPreferences(iceballId, {}, [
        flag("thick", "厚壳式"),
        number("ai.maxChase", "出手距离", 2, 14, 1)
    ]);
}
