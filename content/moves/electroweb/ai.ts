/**
 * 电网 / electroweb 的伙伴 AI 用途。
 *
 * 什么局面下出手：一张抛出去留在场上的网。`available` 要求目标可见、敌对、存活、贴地（飞高的敌人不推荐，
 * 网铺在地面咬不到）、在 `ai.maxChase`（默认 11）以内，且身上还没有 `netted` 身份（再布一张是浪费）。
 * `ai.minFoes` 让威胁身边至少挤着这么多敌人才值得布网；`ai.lead` 给移动中的目标一点提前量，把网撒在它
 * 要经过的位置。
 * 对谁出手：当前威胁；成群、还在移动的优先，慢而厚重、会赖在网里的 Boss 脚下也值得先铺。
 * 够不到怎么办：交给共享接近逻辑；kind 为 point，AI 会把网抛向目标（或提前量）所在的位置。
 * 放完之后：网留在原地继续通电，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    function electrowebWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (target.grounded === false) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            > CompanionBehavior.ai<number>(item, "maxChase", 11)) return false;
        return !CompanionBehavior.status(context, target, "netted");
    }

    function electrowebCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("electroweb", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return electrowebWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "netted");
        },
        /** 给移动中的目标一点提前量：把网撒在它下一刻要经过的位置，而不是此刻站的地方。 */
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 0), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !electrowebWants(context, capability, target)) return 0;
            let base = 22;
            if (electrowebCluster(context, target) >= CompanionBehavior.ai<number>(capability, "minFoes", 2)) base += 24;
            const speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
            if (speed > 0.08) base += 10;
            const mass = CompanionBehavior.mass(context, target);
            if (mass !== null && mass >= 2000) base += 8;
            return base;
        }
    });

    addPreferences("electroweb", {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 20, step: 1,
            help: "威胁离自己这么远以内才考虑布网；调小只在近处布，调大愿意先把网撒在远处的路上。"
        }),
        field(pathOf("ai.minFoes"), "成群时优先", "number", {
            min: 1, max: 4, step: 1,
            help: "威胁身边至少挤着这么多敌人才优先布网；调 1 表示看见就撒。"
        }),
        field(pathOf("ai.lead"), "提前量", "number", {
            min: 0, max: 20, step: 1,
            help: "对移动中的目标提前这么多刻落网；0 表示直接撒在目标当前位置，调大更适合拦冲过来的对手。"
        })
    ]);
}
