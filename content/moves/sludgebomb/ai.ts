/**
 * 污泥炸弹 / sludgebomb —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一枚落点可预判、延时炸开的远程爆弹，挂在共享 attack／ranged 位上。目标可见、敌对、存活、
 *   在 `ai.maxChase`（默认 14）以内就考虑；聚群半径直接取这枚弹的真实 `burstRadius`（含密封与个体体型/特攻贡献），
 *   而不是写死的常数——一次真正能罩住几人才算几人的收益（`ai.crowd`）。
 * 对谁出手：优先还没中毒的目标（毒会持续掉血）；已经中毒的目标只按普通攻击排序。
 *   因为引信给对手留了走开的时间，AI 会估算走离机会：目标当前横移够快、能在引信烧完前离开爆心时降权；
 *   被墙堵住、四向都没有可退空间的扎堆目标加权——不期待锁定追爆。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进投掷距离。
 * 放完之后：掷出动作一结束施法者就能走，引信在真实落点独立走完；伙伴交回共享顺序。
 * 优先级：成堆（≥2 人）40 ／ 在射程内 24 ／ 还需先走近 6；走不掉的 +8，明显能躲开的 −8。
 */
namespace PokemonSkills {
    /** 目标身边、这一枚真实爆心半径内还挤着几个非友方（含目标本身）。 */
    function sludgebombCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var world = CompanionBehavior.world(context);
        var radius = Math.max(1.6, p("sludgebomb", "burstRadius", world));
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    /** 目标四向是否几乎没有可退空间——堵在墙角/窄路的扎堆目标更难躲开这枚弹。 */
    function sludgebombCornered(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        var world = CompanionBehavior.world(context);
        var radius = Math.max(1.6, p("sludgebomb", "burstRadius", world));
        var width = typeof target.width === "number" ? target.width : 0.9;
        var height = typeof target.height === "number" ? target.height : 1.4;
        var offsets = [[radius, 0], [-radius, 0], [0, radius], [0, -radius]], free = 0;
        for (var i = 0; i < offsets.length; i++) {
            try {
                if (world.freeSpace(CompanionBehavior.point([target.point[0] + offsets[i][0], target.point[1], target.point[2] + offsets[i][1]]), width, height)) free++;
            } catch (error) { /* host without freeSpace: keep the neutral count */ }
        }
        return free <= 1;
    }

    /** 目标当前横移速度是否足以在引信烧完前走出爆心。 */
    function sludgebombCanLeave(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        var world = CompanionBehavior.world(context);
        var radius = Math.max(1.6, p("sludgebomb", "burstRadius", world));
        var seconds = Math.max(0.2, p("sludgebomb", "fuseTicks", world) / 20);
        var motion = CompanionBehavior.velocity(context, target);
        if (motion === null) return false;
        var pace = Math.sqrt(motion[0] * motion[0] + motion[2] * motion[2]);
        return pace * seconds >= radius;
    }

    CompanionBehavior.registerUse("sludgebomb", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return 0;
            var base = distance <= capability.data.range ? 24 : 6;
            if (!CompanionBehavior.status(context, target, "poison")) base += 6;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true) && sludgebombCluster(context, capability, target) >= 2) base += 16;
            if (sludgebombCornered(context, target)) base += 8;
            else if (sludgebombCanLeave(context, target)) base -= 8;
            return base;
        }
    });

    addPreferences("sludgebomb", {}, [
        field(pathOf("sealed"), "密封取向", "boolean", {
            help: "开启：爆心半径 ×1.3、推得更远、引信更长、中毒概率 ×1.2，但爆心威力 ×0.9，适合把一枚弹丢进人堆逼散。关闭：一枚更密更狠的弹（威力 ×1.12）、引信更短、范围更紧，适合精确炸单体。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "只有在这个距离以内才把对方列为投弹候选，再由共享接近逻辑把身位送进投掷距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.crowd"), "成堆时优先", "boolean", {
            help: "开启后，目标身边这枚弹的真实爆心半径（随密封、体型与特攻变化）内还挤着别的敌人时优先投弹，一次炸一圈；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为投到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
