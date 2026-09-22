/**
 * 自由落体 / skydrop 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 8）之内，并且**拎得动**——
 * 通过只读探针读目标的原生体重，超过 `ai.maxWeight`（默认 300kg）就放弃，免得白费一次出手。
 * 它是单体重控：`ai.preferIsolated` 打开时，目标身边没有别的敌人时会明显抬高 priority——把它从人群里
 * 摘出去一段时间最值；被围住时让位给普通攻击。目标是自己关注的对象时也略高。
 * 够不到交给共享接近逻辑（抓取距离很短，必须贴到身边）。
 */
namespace CompanionBehavior {
    /** 目标的原生体重探针（千克）；非宝可梦或读取失败按 0 处理。 */
    registerFact("world_combat:move_skydrop/weight", function (access, actor) {
        if (String(actor.domain()) !== "cobblemon") return 0;
        try { return Number(CobblemonCombat.pokemon(actor).weight()); } catch (error) { return 0; }
    });

    function skydropWeight(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const value = fact<number>(context, "world_combat:move_skydrop/weight", target, null);
        return typeof value === "number" && isFinite(value) ? value : 0;
    }

    function skydropValid(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(source(context).point, target.point) > ai<number>(item, "maxChase", 8)) return false;
        return skydropWeight(context, target) <= ai<number>(item, "maxWeight", 300);
    }

    /** 目标身边 4 格内还站着几个别的活敌。 */
    function skydropCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (distance(other.point, target.point) <= 4) count++;
        }
        return count;
    }

    registerUse("skydrop", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skydropValid(context, item, target);
        },
        accepts: function (context, item, target) {
            if (context.facts.mounted) return false;
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            return skydropWeight(context, target) <= ai<number>(item, "maxWeight", 300);
        },
        priority: function (context, item, target) {
            if (!target || !skydropValid(context, item, target)) return 0;
            let base = 26;
            if (ai<boolean>(item, "preferIsolated", true) && skydropCrowd(context, target) === 0) base += 12;
            if (context.facts.focus === target.ref) base += 8;
            return base;
        }
    });
}
namespace PokemonSkills {
    addPreferences("skydrop", { ai: { maxChase: 8, maxWeight: 300, preferIsolated: true } }, [
        field(pathOf("carryHigh"), "高抛", "boolean", {
            help: "开启：提得更高、滞空更久、摔落约 ×1.15，但起手 +3 刻、冷却 +10 刻。关闭（低位速摔）：提得低、摔得轻（约 ×0.85），但收手更快、冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "伙伴在威胁离自己这么远以内时才考虑自由落体；调小只抓贴身的，调大愿意先追上去抓。"
        }),
        field(pathOf("ai.maxWeight"), "可抓体重", "number", {
            min: 50, max: 600, step: 10,
            help: "只对不超过这个体重（千克）的目标出手；调小只抓轻的（更少失败、目标更少），调大敢去抓重目标（可能抓不动而白费一次）。"
        }),
        field(pathOf("ai.preferIsolated"), "落单时优先", "boolean", {
            help: "开启：目标身边 4 格内没有别的敌人时明显优先，把落单的目标摘出去；关闭：只按普通攻击排序。"
        })
    ]);
}
