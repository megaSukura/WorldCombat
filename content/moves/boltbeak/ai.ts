/**
 * 电喙 / boltbeak 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且威胁在 `ai.maxChase`（默认 10）格内。
 * `ai.leadFirst`（默认开）打开时，目标还没打过自己、也没正朝自己出手的那一刻 priority 抬到 45——这正是先手窗口；
 * 它偏好 2 格以外的目标：留出突刺行程才好抢在对手反应前啄到，贴脸先手收益最低。
 * 够不到怎么办：射程交给 dart，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；它是点到即走的先手，不负责收尾。
 */
namespace PokemonSkills {
    function boltbeakWouldLead(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (typeof self.hurtAgo === "number" && self.hurtAgo <= 45 && self.lastAttacker === target.ref) return false;
        return !(typeof target.attacking === "string" && target.attacking === self.ref);
    }

    CompanionBehavior.registerUse(boltbeakId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "leadFirst", true)) return 10;
            if (!boltbeakWouldLead(context, target)) return 10;
            return distance >= 2 ? 45 : 26;
        }
    });

    addPreferences(boltbeakId, {}, [
        field(pathOf("skirmish"), "游斗", "boolean", {
            help: "开启：啄完退得更远（+0.9 格），适合反复抢先进攻，但每啄约轻 10%%、冷却多 4 刻。关闭：站定啄出更重的一口，退步短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "威胁离自己这么远以内才起步突刺；调大愿意从更远处冲上来抢先后。"
        }),
        field(pathOf("ai.leadFirst"), "抢先进攻", "boolean", {
            help: "开启后，尚未被目标打过的时刻优先突刺（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
