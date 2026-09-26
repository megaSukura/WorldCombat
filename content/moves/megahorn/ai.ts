/**
 * 超级角击 / megahorn 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 7）格内；它射程长，够不到先让共享接近逻辑送进角程。
 * 对谁出手：`ai.huntTough`（默认开）把血厚、体型大的目标排得更前——一发最重的单点刺换掉对方主力。
 * 稳定直线才有意义：正对且侧向速度小的目标分最高；快速绕侧、横向移动的目标会降权，等它转回正面再刺。
 * 出手位置：喜欢 2.5 格到射程之间（长角线正好贯穿），贴得太近反而容易刺空。
 * 放完之后：深植式会把目标钉住一会儿，交回共享计划让队友接手；甩角式把目标挑离阵地，接下来继续追。
 */
namespace PokemonSkills {
    function megahornWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
    }

    /** 接近距离取实际射程（共享任务还会再乘一次接近系数），停下时目标稳稳落在角线里。 */
    function megahornApproach(capability: WorldBehavior.Capability): number {
        const range = Number(capability.data.range);
        return isFinite(range) && range > 0 ? range : 2.8;
    }

    CompanionBehavior.registerUse("megahorn", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return megahornApproach(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return megahornWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !megahornWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 24;
            if (distance >= 2.5) score += 4;
            if (distance < 1.2) score -= 6;
            // 快速绕侧的目标会滑出窄角线：按相对角线的横向速度降权；正面站定的目标维持高分。
            const fast = target.velocity;
            if (fast && fast.length >= 3) {
                const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
                const flat = Math.sqrt(dx * dx + dz * dz) || 1;
                const lateral = Math.abs(fast[0] * (-dz / flat) + fast[2] * (dx / flat));
                if (lateral > 0.12) score -= Math.min(9, Math.round(lateral * 32));
            }
            if (CompanionBehavior.ai<boolean>(capability, "huntTough", true) && (target.maximum || 20) >= 90) score += 6;
            return score;
        }
    });

    addPreferences("megahorn", {}, [
        flag("rip", "甩角式"),
        number("ai.maxChase", "出手距离", 3, 14, 1),
        flag("ai.huntTough", "优先硬目标")
    ]);
}
