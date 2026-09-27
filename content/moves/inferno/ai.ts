/**
 * 炼狱 / inferno 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内，且脚下有真实碰撞支撑（花草/水面
 *   这类无碰撞面立不起火柱）；更远交给共享接近逻辑。落点在目标身上时，这一柱能否成立先按本招真实的支撑与
 *   通路判一次。
 * 对谁出手：`ai.preferSlow`（默认开）打开时优先几乎站定或走得很慢的目标——火印的预热窗口里它走不出去，
 *   这一发必灼的重击才不落空；周围挤着同伴时排前（落点能一次包住他们，半径取本个体当前实际公式）；
 *   已经带着共享灼伤身份、或原生免火（必定灼伤对它无效）的目标排后。
 * 它是本组最贵、最慢、也最重的一招，值得在对手被逼住站位时先放。
 * 够不到怎么办：reach 就是本招射程，不够就靠近；AI 会以目标所在位置为落点。
 * 放完之后：一段长冷却，交回共享交战计划。
 */
namespace PokemonSkills {
    /** 原生免火事实：真实实体方法，不是推断。取不到就按不免火处理。 */
    function infernoFireImmune(world: CombatWorld, ref: string): boolean {
        const actor = world.actor(ref);
        if (actor === null) return false;
        const native = world.nativeEntity(actor);
        return native !== null && typeof native.fireImmune === "function" && native.fireImmune() === true;
    }

    function infernoWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
        // 追身只追仍看得见、打得到的敌人，不穿墙点火印。
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    /** 目标当前实际火柱半径内、且从落点真实可达的同伴数，用于扎堆加分。 */
    function infernoCluster(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let radius = 2.8;
        try {
            const world = CompanionBehavior.world(context);
            radius = Math.max(1.2, p("inferno", "bloomRadius", { world: world, actor: world.source(), detail: { values: capability.data.config } }));
        } catch (error) { }
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function infernoStanding(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const velocity = CompanionBehavior.velocity(context, target);
        if (!velocity) return true;
        const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
        return speed < 0.06;
    }

    CompanionBehavior.registerUse("inferno", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return infernoWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !infernoWants(context, capability, target)) return 0;
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            // 目标脚下没有真实支撑就立不起火柱，不值得放。
            if (infernoSupport(world, CompanionBehavior.point(target.point), 4) === null) return 0;
            let score = 22;
            const immune = infernoFireImmune(world, target.ref);
            if (!immune && !CompanionBehavior.status(context, target, "burn")) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "preferSlow", true))
                score += infernoStanding(context, target) ? 8 : -6;
            score += Math.min(16, infernoCluster(context, capability, target) * 8);
            return score;
        }
    });

    addPreferences("inferno", {}, [
        field(pathOf("pin"), "追身式", "boolean", {
            help: "开启：火柱跟着明确选中的目标连烧几道（每道威力 × pinEcho）、半径更大、更容易命中，但每道威力 ×0.82、预热 +4 刻、冷却 +12 刻。关闭（定点式）：一发威力 ×1.06、预热 −2 刻、冷却 −4 刻，但人走开就落空。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离就不主动点火印，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.preferSlow"), "优先站定目标", "boolean", {
            help: "开启：几乎站定或走得很慢的目标排前，预热窗口里它走不出去，这一发更稳；关闭则只按普通远程攻击排序。"
        })
    ]);
}

