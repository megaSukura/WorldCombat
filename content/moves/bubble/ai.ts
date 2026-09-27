/**
 * 泡沫 / bubble 的伙伴 AI 用途。
 *
 * 什么局面下出手：一口扇形泡群，起手短、冷却短、PP 省，适合**反复点**。目标可见、敌对、存活，
 *   且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * 为什么优先跑得快的目标：这招打不疼、但会打滑压速度，`ai.crippleRunners`（默认开）下正在快速移动的
 *   目标多一档分——先把它从速度优势里拽下来。
 * 对谁出手：当前威胁；已经带着共享身份 sudsy 的目标在 `ai.skipSudsy`（默认开）下降一档，把这一口留给还清爽的对手。
 *   按本招实际扇面（射程、张角、泡泡的水平高度带）里真能糊到的非友方人数决定是否值得铺，不再拿目标最大生命当厚目标代理。
 * 够不到怎么办：reach 就是本招射程，不够先走近；泡群会铺开一片，站得正对更划算。
 * 放完之后：被打滑的人掉速度、带着 sudsy 一段时间，伙伴交回共享顺序继续缠斗。
 */
namespace PokemonSkills {
    function bubbleWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    function bubbleMoving(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    /** 本招当前实际扇面（射程/张角），用行动携带的偏好配置求值，和真正施放时一致。 */
    function bubbleFanValues(context: WorldBehavior.Context, capability: WorldBehavior.Capability): { reach: number; span: number } {
        const world = CompanionBehavior.world(context);
        const base = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        try {
            const reach = PokemonSkills.p(bubbleId, "reach", base), span = PokemonSkills.p(bubbleId, "span", base);
            return { reach: isFinite(reach) ? reach : 9, span: isFinite(span) ? span : 60 };
        } catch (error) { return { reach: 9, span: 60 }; }
    }

    /**
     * 本招当前扇面里真能糊到的非友方数量：泡弹沿地面水平飞，所以算水平角、射程与发射口高度带；
     * 仰射/俯射够不到的目标不算，让「值得为一群人铺」来自真实几何而不是血量。
     */
    function bubbleCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const values = bubbleFanValues(context, capability);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const heading = Math.atan2(dz, dx), half = values.span * Math.PI / 360;
        const selfHeight = typeof self.height === "number" && self.height > 0 ? self.height : 1.4;
        const fromY = self.point[1] + selfHeight * 0.3;
        let count = 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const gap = Math.sqrt(ox * ox + oz * oz);
            if (gap > values.reach || gap < 0.001) continue;
            let delta = Math.atan2(oz, ox) - heading;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            if (Math.abs(delta) > half) continue;
            const otherHeight = typeof other.height === "number" && other.height > 0 ? other.height : 1.4;
            if (Math.abs(fromY - other.point[1]) > otherHeight * 0.5 + 0.6) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(bubbleId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return bubbleWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !bubbleWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 15;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "crippleRunners", true) && bubbleMoving(target)) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "skipSudsy", true) && CompanionBehavior.status(context, target, "sudsy")) score -= 7;
            // 真实扇面里能糊到更多人时更值得现在铺；只有目标一个人时不额外加分。
            score += Math.min(12, 4 * Math.max(0, bubbleCrowd(context, capability, target) - 1));
            return score;
        }
    });

    addPreferences(bubbleId, {}, [
        field(pathOf("dense"), "密泡式", "boolean", {
            help: "开启：每轮 +2 泡、扇面 ×1.3、打滑概率 +10%、可掉 2 级速度、打滑时长 ×1.4，适合把一片人糊住拖慢；代价是威力 ×0.85、泡泡速度 ×0.85、射程 −1.5 格、起手 +2 刻。关闭（急泡）：威力 ×1.12、泡泡速度 ×1.12、射程 +2 格，代价是打滑概率 −4%、打滑时长 ×0.8，打完就走。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动吹泡，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.crippleRunners"), "优先打滑跑得快的", "boolean", {
            help: "开启：正在快速移动的目标多一档分，先用泡泡把它压慢；关闭则所有目标同价。"
        }),
        field(pathOf("ai.skipSudsy"), "跳过已打滑的", "boolean", {
            help: "开启：已经带着共享身份 sudsy 的目标降一档，把这一口留给还清爽的对手；关闭则一视同仁。"
        })
    ]);
}
