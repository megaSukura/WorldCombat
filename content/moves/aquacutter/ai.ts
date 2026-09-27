/**
 * 水波刀 / aquacutter 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * `ai.cluster`（默认开）实际改变候选排序：开启时按本招**真实的三维弹道、判定半径、墙体与穿透预算**数出
 *   真正能被这一道水线切中的敌人；能切穿两个以上才抬到优先——一道水线贯穿成排才是它的价值。
 * 关闭则不数直线，当单点远程招排。
 * 放完之后：交回共享交战计划；它是点到即穿的直线招，掷完不改变站位。
 */
namespace PokemonSkills {
    /** 按本个体实际公式（半径）与本次真实弹道，数出这一道水线真正能切中的敌人（含墙与穿透预算）。 */
    function aquacutterReachable(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 0.05) return 0;
        const ux = dx / length, uy = dy / length, uz = dz / length;
        const access = CompanionBehavior.world(context);
        let radius = 0.28, bore = 1;
        try {
            const values = { world: access, actor: access.source(), skill: PokemonSkills.skills[aquacutterId],
                detail: { values: capability.data.config || {} } };
            radius = Math.max(0.1, PokemonSkills.p(aquacutterId, "radius", values));
            bore = Math.max(1, Math.round(PokemonSkills.p(aquacutterId, "bore", values)));
        } catch (error) { }
        const reach = Number(capability.data.range) || length;
        const origin = CompanionBehavior.point(self.point), nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let hits = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oy = other.point[1] - self.point[1], oz = other.point[2] - self.point[2];
            const forward = ox * ux + oy * uy + oz * uz;
            if (forward <= 0.2 || forward > reach) continue;
            const px = ox - forward * ux, py = oy - forward * uy, pz = oz - forward * uz;
            const lateral = Math.sqrt(px * px + py * py + pz * pz);
            const half = typeof other.width === "number" && isFinite(other.width) ? other.width / 2 : 0.45;
            if (lateral > radius + half) continue;
            if (WorldGeometry.blockHit(access, origin, CompanionBehavior.point(other.point))) continue;
            hits++;
            if (hits >= bore) break;
        }
        return hits;
    }

    CompanionBehavior.registerUse(aquacutterId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 25;
            return aquacutterReachable(context, capability, target) >= 2 ? 40 : 25;
        }
    });

    addPreferences(aquacutterId, {}, [
        field(pathOf("lance"), "贯流式", "boolean", {
            help: "开启：威力 ×1.12、贯穿目标多 1、水线收窄 0.05 格，代价是喷射 ×0.88、冷却多 7 刻；关闭：喷射 ×1.12、判定放宽 0.08 格、冷却少 5 刻，代价是威力 ×0.94。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动喷水线，先走近；越大越愿意从远处切出去。"
        }),
        field(pathOf("ai.cluster"), "贯穿一排", "boolean", {
            help: "开启：按本招真实弹道、判定半径、墙体与穿透预算，数出这一道水线能切中两个以上敌人时才优先喷出，一道切穿一排；关闭：不数直线，当普通远程切斩排序。"
        })
    ]);
}
