/**
 * 巴投 / circlethrow —— 伙伴 AI 用途。
 *
 * 什么局面下出手：贴身过肩摔，带伤害也带逐退，只对一个人。`available` 要求威胁在 `ai.maxChase`（默认 7）格内；
 *   更远由共享接近逻辑走过去，实际抓取距离由 grip 决定（很短）。
 * 对谁出手：`selectTarget` 只接一个——优先「正在攻击自己或主人」的那个（借它冲上来的力摔最顺），并列时挑最近的。
 *   出手前用 `CompanionBehavior.world(context).freeSpace` 探一下自己背后是否有放得下它的空位，有可靠落点时更愿意出手；
 *   玩家「关注」的焦点目标直接 honored；`accepts` 排除友方、已死、不可见与已经带着「溃退」的目标。
 * 什么时候最想出手：对手已经贴得很近、正在攻击、且身后有空位时 priority 抬高——它是一记贴身反击，不是远攻。
 * 够不到怎么办：reach 是抓取距离，共享任务先贴上去再抓。
 * 放完之后：目标挨一记摔击、被摔到背后并可能强制换下，伙伴交回共享交战计划。
 * `ai.leaveStation`：驻守中的伙伴是否愿意离位去抓（默认关闭）。
 */
namespace CompanionBehavior {
    function circlethrowCandidates(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity[] {
        const self = source(context), limit = ai<number>(item, "maxChase", 7);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return !other.friendly && other.health > 0 && other.visible && distance(self.point, other.point) <= limit;
        });
    }

    function circlethrowWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, subject: Entity): boolean {
        if (subject.friendly || subject.health <= 0 || !subject.visible) return false;
        if (status(context, subject, "routed")) return false;
        return distance(source(context).point, subject.point) <= ai<number>(item, "maxChase", 7);
    }

    /** 出手前探一探自己背后（背对目标的方向）有没有放得下这个目标的可达空位。 */
    function circlethrowLanding(context: WorldBehavior.Context, item: WorldBehavior.Capability, subject: Entity): boolean {
        const self = source(context), access = world(context);
        const dx = subject.point[0] - self.point[0], dz = subject.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return false;
        const reach = Math.max(2, item.data.range + 1);
        const behind = point([self.point[0] - dx / length * reach, self.point[1], self.point[2] - dz / length * reach]);
        try { return access.freeSpace(behind, subject.width || 0.9, subject.height || 1.4); }
        catch (error) { return true; }
    }

    registerUse("circlethrow", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return circlethrowWants(context, item, target);
        },
        selectTarget: function (context, item, proposed) {
            if (proposed && (proposed.ref === context.facts.focus || circlethrowWants(context, item, proposed))) return proposed;
            const candidates = circlethrowCandidates(context, item).filter(function (other) { return circlethrowWants(context, item, other); });
            if (!candidates.length) return proposed || null;
            const self = source(context);
            candidates.sort(function (a, b) {
                const aAggressive = a.attacking === self.ref ? 0 : 1, bAggressive = b.attacking === self.ref ? 0 : 1;
                return aAggressive - bAggressive || distance(self.point, a.point) - distance(self.point, b.point);
            });
            return candidates[0];
        },
        accepts: function (context, item, target) { return circlethrowWants(context, item, target); },
        priority: function (context, item, target) {
            if (!target) return 22;
            const self = source(context), limit = Math.max(1, ai<number>(item, "maxChase", 7));
            let base = 26 + Math.round((1 - Math.min(1, distance(self.point, target.point) / limit)) * 10);
            if (target.attacking === self.ref) base += 8;
            if (circlethrowLanding(context, item, target)) base += 4;
            if (ratio(self) < 0.5) base += 6;
            return Math.min(80, base);
        }
    });

    PokemonSkills.addPreferences("circlethrow", { ai: { maxChase: 7, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "抓取距离", 2, 12, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
