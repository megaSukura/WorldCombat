/**
 * 龙尾 / dragontail —— 伙伴 AI 用途。
 *
 * 什么局面下出手：从一侧摆到另一侧的正面扇形横扫，带伤害也带逐退。`available` 只要求威胁在 `ai.maxChase`
 *   （默认 8）格内；更远由共享接近逻辑走过去。
 * 对谁出手：`selectTarget` 挑「扇里人最多」的那个方向当正面，并偏向正在攻击自己／主人的高威胁目标——让它在
 *   扇心（通常正是尾梢区）先吃这一扫；踢飞抗性高的对手仍会被这一记打中，只是送不动。玩家「关注」的焦点目标直接 honored。
 * 什么时候最想出手：扇里人多时 priority 更高；自己血量偏低时略微提前——被围住时先扫开一圈。
 * 够不到怎么办：reach 就是尾扫半径，共享任务先靠近到射程内再扫。
 * 放完之后：被扫中者受伤、沿背离你的方向被送开并可能被强制换下，伙伴交回共享交战计划。
 * `ai.leaveStation`：驻守中的伙伴是否愿意离位去扫（默认关闭）。
 */
namespace CompanionBehavior {
    function dragontailArc(context: WorldBehavior.Context, item: WorldBehavior.Capability, subject: Entity): number {
        const self = source(context), limit = item.data.range, halfAngle = ai<number>(item, "arc", 75) * Math.PI / 180;
        const dx = subject.point[0] - self.point[0], dz = subject.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        const cosHalf = Math.cos(halfAngle);
        let count = 1;
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (other.ref === subject.ref || other.friendly || other.health <= 0 || !other.visible) return;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > limit || distance < 1e-6) return;
            if ((ox * dx + oz * dz) / (distance * length) >= cosHalf) count++;
        });
        return count;
    }

    /** 方向分：扇里人越多越好，正在攻击自己的高威胁者当扇心再加一点。 */
    function dragontailScore(context: WorldBehavior.Context, item: WorldBehavior.Capability, subject: Entity): number {
        const threat = subject.attacking === source(context).ref ? 1.5 : 0;
        return dragontailArc(context, item, subject) * 2 + threat;
    }

    function dragontailCandidates(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity[] {
        const self = source(context), limit = ai<number>(item, "maxChase", 8);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return !other.friendly && other.health > 0 && other.visible && distance(self.point, other.point) <= limit;
        });
    }

    registerUse("dragontail", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 8);
        },
        selectTarget: function (context, item, proposed) {
            if (proposed && proposed.ref === context.facts.focus) return proposed;
            const candidates = dragontailCandidates(context, item);
            if (!candidates.length) return proposed || null;
            let best = candidates[0], bestScore = dragontailScore(context, item, candidates[0]);
            for (let i = 1; i < candidates.length; i++) {
                const score = dragontailScore(context, item, candidates[i]);
                if (score > bestScore) { bestScore = score; best = candidates[i]; }
            }
            return best;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target) return 24;
            let base = 24 + Math.min(18, dragontailScore(context, item, target) * 3);
            if (ratio(source(context)) < 0.5) base += 6;
            return Math.min(80, base);
        }
    });

    PokemonSkills.addPreferences("dragontail", { ai: { maxChase: 8, arc: 75, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.number("ai.arc", "瞄准半角", 30, 120, 5),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
