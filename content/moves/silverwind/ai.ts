/**
 * 银色旋风 / silverwind —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一扇向前铺开的中距鳞粉。`available` 要求目标可见、敌对、存活，且在自己
 *   `ai.maxChase`（默认 12）格内；焦点目标不受距离限制。它不挑目标站不站在地上（鳞粉是一扇，空中也扫）。
 * 选择倾向：`ai.preferCrowd`（默认开）打开时，目标所在的扇向前方还挤着别的敌人就抬高 priority——
 *   这一扇能同时照顾并排的几个人；关闭则只看距离与常规攻击排序。
 * 够不到交给共享接近逻辑；进了射程就抖翅。放完交回共享交战计划。
 */
namespace PokemonSkills {
    function silverwindCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("silverwind", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            let base = 17;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) {
                const count = silverwindCrowd(context, capability, target);
                if (count >= 2) base += Math.min(18, (count - 1) * 6);
            }
            return base;
        }
    });

    addPreferences("silverwind", {}, [
        field(pathOf("dense"), "浓鳞式", "boolean", {
            help: "开启：扇面长度约 ×0.82、张角约 ×0.8、威力约 ×1.1、反哺概率 +0.05，但冷却更长，适合只割点名的一个方向、更重。关闭（疏鳞式，默认）：铺得更远更宽、出手更快，适合一次扫过并排的一小片。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动抖翅，先走近；越大越愿意对更远的目标扫去。"
        }),
        field(pathOf("ai.preferCrowd"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3 格内还站着别的敌人时优先，一扇能同时割到好几个人；关闭则只按普通攻击排序。"
        })
    ]);
}
