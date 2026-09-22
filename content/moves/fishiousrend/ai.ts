/**
 * 鳃咬 / fishiousrend 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且威胁在 `ai.maxChase`（默认 8）格内。
 * `ai.leadFirst`（默认开）打开时，目标还没打过自己、也没正朝自己出手的那一刻 priority 抬到 45——这正是先手窗口；
 * 它偏好贴身目标（3 格以内）：扑咬距离短，近身才咬得住并拖得动。
 * 够不到怎么办：射程交给 lunge，共享任务把身位收进射程后再出手。
 * 放完接什么：交回共享交战计划；咬住拖近之后交给后续的近战。
 */
namespace PokemonSkills {
    function fishiousrendWouldLead(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (typeof self.hurtAgo === "number" && self.hurtAgo <= 45 && self.lastAttacker === target.ref) return false;
        return !(typeof target.attacking === "string" && target.attacking === self.ref);
    }

    CompanionBehavior.registerUse(fishiousrendId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "leadFirst", true)) return 8;
            if (!fishiousrendWouldLead(context, target)) return 8;
            return distance <= 3 ? 45 : 22;
        }
    });

    addPreferences(fishiousrendId, {}, [
        field(pathOf("deepbite"), "深咬", "boolean", {
            help: "开启：拖拽多 0.4 格、压速多一级，猎物被牢牢钉住，但起手多 3 刻、冷却多 6 刻。关闭：快咬一口，拖拽与压速都小，更快更省。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "威胁离自己这么远以内才扑上去咬；调大愿意先追一段。"
        }),
        field(pathOf("ai.leadFirst"), "抢先下口", "boolean", {
            help: "开启后，尚未被目标打过的时刻优先扑咬（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
