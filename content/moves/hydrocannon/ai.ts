/**
 * 加农水炮的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、活着且在射程以内；因为打完要力竭一段，自身生命要高于 `ai.minHealth`
 * （或这一炮能收掉残血）才出手。
 * 对谁出手：开启 `ai.preferSoaked` 时优先挑身上带着 `world_combat:status/soaked` 的敌人——水柱对湿透的目标
 * 多一份 `drenchBonus`，所以它跟着队友的水招或自己上一发继续打；没有湿的目标就按提案目标来。
 * 怎么够到：共享接近把身位收到射程以内，然后朝目标喷出水柱（`kind: "enemy"`）。
 * 出手前后：放完交回共享交战计划；力竭期间招式由共享起手门禁自动屏蔽。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("hydrocannon", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            if (proposed.friendly || !(proposed.health > 0) || !proposed.visible) return proposed;
            if (!CompanionBehavior.ai<boolean>(capability, "preferSoaked", true)) return proposed;
            if (CompanionBehavior.status(context, proposed, "soaked")) return proposed;
            const self = CompanionBehavior.source(context);
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let best: CompanionBehavior.Entity | null = null;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || !(other.health > 0) || !other.visible) continue;
                if (CompanionBehavior.distance(self.point, other.point) > capability.data.range) continue;
                if (!CompanionBehavior.status(context, other, "soaked")) continue;
                if (best === null || other.health < best.health) best = other;
            }
            return best || proposed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(self) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.ratio(target) <= 0.3) return 42;
            if (CompanionBehavior.status(context, target, "soaked")) return 34;
            return 22;
        }
    });

    addPreferences("hydrocannon", {}, [
        field(pathOf("pressurized"), "加压", "boolean", {
            help: "开启：水柱收成更细更快的一线——单伤更高、顶得更远，但判定更窄更容易打空，力竭也更久；关闭：水花散开，判定更粗更容易擦中，但单伤更低、顶不动，恢复更快。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动喷水（除非目标已残）。越高越怕留下力竭空挡。"
        }),
        field(pathOf("ai.preferSoaked"), "追着湿的目标打", "boolean", {
            help: "开启：候选里有带浸湿身份的目标时，优先改打它——水柱对湿透的目标更重；关闭：只打当前提案的目标。"
        })
    ]);
}
