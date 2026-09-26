/**
 * 溶解液 / acid —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 12）格内；它是短射程的低弧泼溅，先收身位再泼。
 *   手动施放时本招是 aim，可以不对任何实体、只朝空点铺池；AI 仍只从敌人里挑用途，两者分开。
 * 对谁出手：`ai.crowd`（默认开）打开时，目标 3 格内还挤着别的敌人就抬高 priority——泼溅与酸池能多咬几个，
 *   适合路口或扎堆的慢目标；关闭则只按普通近程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进范围之后再泼。
 * 放完接什么：落点留下腐蚀酸池，交回共享交战计划继续；酸池自己会反复咬留在圈里的人，不需要追着某个目标再泼。
 */
namespace PokemonSkills {
    function acidCrowdCount(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("acid", {
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
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            return acidCrowdCount(context, target) >= 2 ? base + 12 : base;
        }
    });

    addPreferences("acid", {}, [
        field(pathOf("corrode"), "腐蚀强化", "boolean", {
            help: "开启：酸池半径 ×1.25、时长 +30 刻、每跳 ×1.4、起手 +1 刻、冷却 +6 刻，但单发泼溅 ×0.85，适合封住一片地。关闭：一发更痛的泼溅、酸池较小，适合打疼一群人。"
        }),
        field(pathOf("ai.maxChase"), "泼溅距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动泼酸，先走近；越大越愿意在更远处先手泼。"
        }),
        field(pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启后，目标 3 格内还有别的敌人时优先泼酸，泼溅与酸池能多咬一个；关闭则只按普通近程攻击排序。"
        })
    ]);
}
