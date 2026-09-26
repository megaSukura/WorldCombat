/**
 * 连续拳 / cometpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带连续拳的伙伴把它当**站定固定拳道连拳**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 6）以内、且大致落在身前拳道里就出手；更远或绕到背后的交给共享接近/其他招。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。目标短暂停留（速度低）时排得更前——固定拳道
 *   不吃走位，站定的目标能把整串吃满；已经绕到侧后（不在身前拳道里）的目标排后，因为它不在固定拳道里、
 *   这串会提前收。`ai.crowds`（默认开）且本个体选了乱打式时，目标近旁还站着别的敌人会再加分。
 * 够不到怎么办：reach 就是本招射程，不够先走近；连拳之间目标若倒下或走出拳道，这一串自然收住。
 * 放完之后：这一串砸完（或目标走出拳道）就收拳，交回共享交战计划等冷却。
 * 优先级：基础 18；已在射程内 +5；目标速度低 +7、高速 −5；绕到侧后 −6；乱打式且 `ai.crowds` 开启、目标近旁 ≥1 个敌人 +9。
 */
namespace CompanionBehavior {
    function cometpunchWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 6);
    }

    /** 目标当前的水平速度；没有速度事实时按「站住」处理。 */
    function cometpunchSpeed(target: Entity): number {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    /** 施法者当前的水平朝向；读不到时返回 null（此时不做绕后判断）。 */
    function cometpunchFacing(context: WorldBehavior.Context): CombatPoint | null {
        try {
            const world = CompanionBehavior.world(context), actor = world.actor(source(context).ref);
            return actor !== null ? WorldGeometry.facing(world, actor) : null;
        } catch (ignored) { return null; }
    }

    /** 目标是否落在施法者身前的固定拳道方向里（约为半角 60° 的锥）。 */
    function cometpunchInLane(context: WorldBehavior.Context, target: Entity): boolean {
        const facing = cometpunchFacing(context);
        if (facing === null) return true;
        const self = source(context).point;
        const flat = WorldGeometry.flatUnit(WorldCombat.point(target.point[0] - self[0], 0, target.point[2] - self[2]),
            WorldGeometry.flatUnit(facing));
        const forward = WorldGeometry.flatUnit(facing);
        return WorldGeometry.dot(flat, forward) >= Math.cos(60 * Math.PI / 180);
    }

    /** 目标近旁（3 格内）还站着几个别的敌人；乱打式据此判断值不值得罩开。 */
    function cometpunchCrowd(context: WorldBehavior.Context, target: Entity): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= 3) count++;
        }
        return count;
    }

    /** 本个体是否选了乱打式；AI 只在能罩开一片时才偏好扎堆的目标。 */
    function cometpunchScatters(item: WorldBehavior.Capability): boolean {
        const config = item.data.config;
        return !!(config && config.scatter === true);
    }

    registerUse("cometpunch", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return cometpunchWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !cometpunchWants(context, item, target)) return 0;
            const gap = CompanionBehavior.distance(source(context).point, target.point);
            let score = 18;
            if (gap <= item.data.range) score += 5;
            if (cometpunchSpeed(target) < 0.03) score += 7;
            else if (cometpunchSpeed(target) > 0.12) score -= 5;
            if (!cometpunchInLane(context, target)) score -= 6;
            if (cometpunchScatters(item) && ai<boolean>(item, "crowds", true) && cometpunchCrowd(context, target) >= 1) score += 9;
            return score;
        }
    });

    PokemonSkills.addPreferences("cometpunch", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("scatter"), "乱打式", "boolean", {
            help: "开启（乱打）：每拳散着砸向身前一片固定扇面，一记能同时盖到并排的第二个人；代价是单拳威力 ×0.85、顶退 ×0.6、拳数收在 5、冷却 +2 刻。关闭（聚焦，原生式）：全部砸在同一条固定窄道上，单拳威力 ×1.2、顶退 ×1.4；代价是拳数收在 4、只打一个目标。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 12, step: 1,
            help: "超过这个距离就不主动起拳，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowds"), "瞄向扎堆", "boolean", {
            help: "开启：本个体选了乱打式、且目标近旁还站着别的敌人时更愿意起拳，因为一记乱拳能同时盖到好几个；关闭或聚焦式则只按普通近身攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为连续拳离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
