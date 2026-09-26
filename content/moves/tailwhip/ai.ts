/**
 * 摇尾巴 的伙伴 AI 用途：这招自己的一套出手计划——把该甩的人放到背后，再左右两扫。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内，而且以自己为圆心、尾巴半径内至少站着
 *   ai.minFoes 个看得见、还没被破防的非友方（默认 1）。它铺在身后，所以最适合敌人追在背后时回身一记。
 * 对谁出手：当前威胁；已经带着 guardbroken 身份（任何来源）时跳过，避免重复。
 * 朝哪甩：提交方向取“背对威胁”——AI 给出一个背离威胁的朝向点，尾巴因此扫向追兵；接近距离直接取
 *   本个体这次解析出的 capability 射程（item.data.range），不再另写一套公式。接近只到尾巴半径，不冲进人堆中心。
 * 够不到怎么办：reach 就是尾巴半径，由共享任务把身体带到追兵附近；这招靠近本身就是它的准备。
 * 放完之后：身后扇带里的敌人一起掉防御，伙伴交回共享顺序。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("tailwhip", { ai: { maxChase: 10, minFoes: 1, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** 尾巴半径内看得见、未被破防的非友方数量；掩体挡住的（不可见）不计。 */
    function tailwhipFoes(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, centre) <= radius) count++;
        }
        return count;
    }

    function tailwhipWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        if (status(context, threat, "guardbroken")) return false;
        return tailwhipFoes(context, self.point, item.data.range) >= ai<number>(item, "minFoes", 1);
    }

    registerUse("tailwhip", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || tailwhipWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        // 先把该甩的人放到背后：朝背离威胁的方向出手，尾巴才会扫到追兵。
        approachTarget: function (_context, _item, target) { return target; },
        target: function (context, item, target) {
            const self = source(context);
            const dx = self.point[0] - target.point[0], dz = self.point[2] - target.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            const away = length > 1e-4 ? [dx / length, 0, dz / length] : [0, 0, 1];
            const forward = Math.max(1, Math.min(item.data.range, 2));
            const aim: Entity = JSON.parse(JSON.stringify(self));
            aim.point = [self.point[0] + away[0] * forward, self.point[1], self.point[2] + away[2] * forward];
            return aim;
        },
        priority: function (context, item, target) {
            if (!target || !tailwhipWants(context, item, target)) return 0;
            return Math.min(90, 55 + tailwhipFoes(context, source(context).point, item.data.range) * 6);
        }
    });
}
