/**
 * 冰球 / iceball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 9）格以内；更远交给共享接近逻辑。
 * 对谁出手：宽阔通路里的大目标（Boss、大体型）优先——后几发球更粗也更重，越大越难躲开；
 *   起手前用只读空域探针 `world.freeSpace` 沿整段瞄准通道探球径，并按未来变粗后的最大球径检查，
 *   狭窄门口后续大球会先撞门框，这时降一档，宁可靠近换角度。
 * 放完之后：施法者在这几秒里定住不动，是它最脆的窗口；碎开后会交回共享交战计划，带着冷却时不会重复推。
 */
namespace PokemonSkills {
    /** 沿准线整段通道探一次：按未来变粗后的最大球径做实体箱空域检查，窄门/夹缝返回 false。按决策帧缓存一次。 */
    function iceballOpen(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_iceball/open:" + target.ref, function () {
            try {
                const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
                const from = self.point, dx = target.point[0] - from[0], dz = target.point[2] - from[2];
                const span = Math.sqrt(dx * dx + dz * dz);
                if (!(span > 1.5)) return true;
                const ux = dx / span, uz = dz / span, reach = Math.min(span - 0.6, 3.5);
                if (!(reach > 0)) return true;
                const values = { world: world, actor: world.source(), detail: { values: capability.data.config } };
                const base = p(iceballId, "radius", values);
                const girth = p(iceballId, "girth", values);
                const cap = p(iceballId, "girthMax", values);
                // 未来变粗：整段按最大球径检查，当前更小的球一定能过同一段。
                const grown = Math.min(cap, base + girth * 4);
                const width = Math.max(0.5, grown * 2);
                for (let step = 0; step <= 6; step++) {
                    const along = reach * step / 6;
                    const probe = CompanionBehavior.point([from[0] + ux * along, from[1], from[2] + uz * along]);
                    if (!world.freeSpace(probe, width, width)) return false;
                }
                return true;
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
            if (!iceballOpen(context, capability, target)) score -= 10;
            return Math.max(5, score);
        }
    });

    addPreferences(iceballId, {}, [
        flag("thick", "厚壳式"),
        number("ai.maxChase", "出手距离", 2, 14, 1)
    ]);
}
