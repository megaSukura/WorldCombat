/**
 * 增强拳 / poweruppunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 为什么先出手：这是一记起势拳——还没戴上「拳已变硬」（`world_combat:status/hardened`）时 priority 34，
 *   先把物攻垫起来；已经戴着时降到 24，交回共享交战计划去用别的招，只在 `ai.topUp`（默认开）下继续补拳。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；拳程很短，不够先贴近。
 * 放完之后：带着硬化窗口时不再抢着连打，让更重的招去吃掉这段物攻。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("poweruppunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.status(context, self, "hardened")) return 34;
            if (!CompanionBehavior.ai<boolean>(capability, "topUp", true)) return 0;
            return 24;
        }
    });

    addPreferences("poweruppunch", {}, [
        field(pathOf("charge"), "蓄劲拳", "boolean", {
            help: "开启：起手更久、本拳轻 20%，但一记硬化 2 级、窗口长 40%、冷却短 20%——用时间换更陡的起势。关闭（速拳）：出手更快、本拳重 12%，但一记只硬 1 级、窗口更短、冷却更长。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。拳程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.topUp"), "起势后补拳", "boolean", {
            help: "开启：已经戴着「拳已变硬」时仍愿意继续补拳维持等级；关闭则交给共享交战计划，把出手机会让给更重的招。"
        })
    ]);
}
