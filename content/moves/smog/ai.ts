/**
 * 浊雾 / smog —— 伙伴 AI 用途。
 *
 * 什么局面下出手：正前方一团滚雾，射程短、伤害低、PP 多、中毒概率最高，挂在共享 attack 位上。
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 8）以内就考虑；雾会铺满喷口到落点的一整条路，
 *   所以沿这条路还挤着别人时（`ai.cluster`）最值，一口能熏一片。
 * 对谁出手：按**团路覆盖的未毒敌人数**估值。主目标已经中毒也不因此放弃整群——只要雾路上还有未毒的人，
 *   仍值得出手（`ai.seekUnpoisoned` 默认开；关掉则连已毒的人也算进覆盖数）。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进喷吐距离。
 * 放完之后：雾自己滚远，伙伴交回共享顺序；空喷只走冷却；窄走廊或两道墙之间额外加分，适合封路。
 */
namespace PokemonSkills {
    /** 从自身沿 source→target 方向、在射程内、离中轴 1.8 格以内的敌人；按是否计入已毒者数出覆盖人数。 */
    function smogCovered(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context).point;
        const dx = target.point[0] - self[0], dy = target.point[1] - self[1], dz = target.point[2] - self[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 0.01) return 0;
        const reach = Number(capability.data.range) || 6;
        const seek = CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (seek && CompanionBehavior.status(context, other, "poison")) continue;
            const ox = other.point[0] - self[0], oy = other.point[1] - self[1], oz = other.point[2] - self[2];
            const project = (ox * dx + oy * dy + oz * dz) / length;
            if (project < -0.5 || project > reach) continue;
            const t = project / length;
            const lateral = CompanionBehavior.distance(other.point, [self[0] + dx * t, self[1] + dy * t, self[2] + dz * t]);
            if (lateral > 1.8) continue;
            count++;
        }
        return count;
    }

    /** 两侧是不是被墙夹住：用原生 freeSpace 探头在中轴两侧 2.4 格各探一次，返回被挡的侧数。 */
    function smogNarrow(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        if (typeof (world as any).freeSpace !== "function") return 0;
        const self = CompanionBehavior.source(context).point;
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1) return 0;
        const px = -dz / length, pz = dx / length;
        const mx = (self[0] + target.point[0]) / 2, mz = (self[2] + target.point[2]) / 2, y = self[1];
        let blocked = 0;
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? 2.4 : -2.4;
            if (!world.freeSpace(CompanionBehavior.point([mx + px * side, y, mz + pz * side]), 0.9, 1.4)) blocked++;
        }
        return blocked;
    }

    CompanionBehavior.registerUse("smog", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            // 主目标已毒时，只要雾路上还有未毒的人就仍值得吐；整路都毒才放弃这次候选。
            if (CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true) && CompanionBehavior.status(context, target, "poison")
                && smogCovered(context, capability, target) <= 0) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return 0;
            let base = distance <= capability.data.range ? 20 : 6;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                const covered = smogCovered(context, capability, target);
                if (covered > 0) base += Math.min(18, covered * 6);
            }
            if (smogNarrow(context, target) > 0) base += 6;
            return base;
        }
    });

    addPreferences("smog", {}, [
        field(pathOf("billow"), "滚涌取向", "boolean", {
            help: "开启：雾锥张角 ×1.2、喷吐距离 ×1.15、中毒概率 ×1.15，但单段威力 ×0.85、滚得更慢，适合一口熏一片。关闭（尖吹）：雾团更窄更浓、威力 ×1.15、来得更快，适合精准熏单个目标。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "只有在这个距离以内才把对方列为喷吐候选，再由共享接近逻辑把身位送进喷吐距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.seekUnpoisoned"), "只按未毒人数估值", "boolean", {
            help: "开启后，按雾路上还没中毒的敌人数决定值不值得吐；主目标已毒但路上还有未毒的人时仍会出手。关闭则已毒的人也算进覆盖数。"
        }),
        field(pathOf("ai.cluster"), "成堆时优先", "boolean", {
            help: "开启后，雾路覆盖的敌人越多排得越靠前，一口熏一片；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为喷到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
