/**
 * 尖刺臂 / needlearm 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 7）格内。
 * 选择倾向：它是一记大张角的横扫，价值在「一次覆盖一圈」，所以被多敌贴近、或有人贴着你侧向绕行时优先；
 *   `ai.cluster`（默认开）打开时，还会为贴地的目标加分、为正在跑开的目标降档。
 * 落点：AI 取敌群扇面的中心（`needlearmFocus`）作为挥击落点，而不是只对着最近那一个，
 *   这样短扑后的一段弧能把围着的人一起扫到。
 */
namespace PokemonSkills {
    function needlearmEnemies(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): CompanionBehavior.Entity[] {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const found: CompanionBehavior.Entity[] = [target];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) found.push(other);
        }
        return found;
    }

    /** 敌群扇面中心：以目标为起点，把附近同圈敌人的位置平均，作为挥击落点。 */
    function needlearmFocus(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): CompanionBehavior.Entity {
        const group = needlearmEnemies(context, target, radius);
        const copy: CompanionBehavior.Entity = JSON.parse(JSON.stringify(target));
        if (group.length <= 1) return copy;
        let x = 0, y = 0, z = 0;
        for (let i = 0; i < group.length; i++) { x += group[i].point[0]; y += group[i].point[1]; z += group[i].point[2]; }
        copy.point = [x / group.length, y / group.length, z / group.length];
        return copy;
    }

    /** 是否有敌人贴着你绕到侧面/身后（两敌方向夹角超过约 120°）。 */
    function needlearmSurround(context: WorldBehavior.Context, group: CompanionBehavior.Entity[]): boolean {
        const self = CompanionBehavior.source(context);
        const around: number[][] = [];
        for (let i = 0; i < group.length; i++) {
            const dx = group[i].point[0] - self.point[0], dz = group[i].point[2] - self.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length > 0.1) around.push([dx / length, dz / length]);
        }
        for (let a = 0; a < around.length; a++) for (let b = a + 1; b < around.length; b++)
            if (around[a][0] * around[b][0] + around[a][1] * around[b][1] < -0.5) return true;
        return false;
    }

    function needlearmWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse(needlearmId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return needlearmWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, target) {
            return needlearmFocus(context, target, typeof capability.data.range === "number" ? capability.data.range : 2.6);
        },
        priority: function (context, capability, target) {
            if (!target || !needlearmWants(context, capability, target)) return 0;
            let base = 22;
            const span = typeof capability.data.range === "number" ? capability.data.range : 2.6;
            const group = needlearmEnemies(context, target, span);
            if (group.length >= 2) base += Math.min(16, (group.length - 1) * 6);
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true)) {
                if (needlearmSurround(context, group)) base += 8;
                if (target.grounded === true) base += 4;
                if (CompanionBehavior.fleeing(context, target)) base -= 8;
            }
            return base;
        }
    });

    addPreferences(needlearmId, {}, [
        field(pathOf("broad"), "横扫式", "boolean", {
            help: "开启：扇面更宽、挥扫更远，但挥击更轻、起手更慢、冷却更长，适合被多敌贴身、有人绕后时一次扫开。关闭（重挥式，默认）：挥击更重、出手更快、冷却更短，但扇面更窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动挥击，先走近。越大越会在稍远处起抡，也越容易在接近时被对手走开。"
        }),
        field(pathOf("ai.cluster"), "只为敌群/绕行加分", "boolean", {
            help: "开启：多敌贴身、有人侧向绕行、目标贴地时优先挥击，跑动中的目标降档；关闭：当普通近身招处理，不为扇面覆盖加分。"
        })
    ]);
}
