/**
 * 吸取之吻 / drainingkiss 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 8）格内；焦点目标不受距离限制。
 *   它是一记纯贴身的续航吸招：`priority` 在自身血量低于 `ai.healBelow`（默认 0.85）时抬一档，把这一吻当回血手段先用。
 *   本招要真正贴上身体并保持几刻，所以更愿意找**走得慢、被控住、正停着**的目标；对近处高速高威胁的敌人降低评分。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 够不到怎么办：射程就是亲吻距离（1 格上下），共享接近逻辑把身位收到贴得上的距离再出手。
 * 放完之后：交回共享顺序；它不占手，下一次决策就能再用。
 */
namespace CompanionBehavior {
    registerUse("drainingkiss", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        // 这记吻要真正贴上身体并保持几刻：接近到几乎贴上再出手，接触由 ready/execute 复核。
        reach: function (context, capability) { return Math.min(capability.data.range, 0.6); },
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
            if (!target || !capability) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const injured = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.85);
            // 慢/停驻的目标更能把吻保持完；贴上来很快的高威胁目标则难维持。
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt((velocity[0] || 0) * (velocity[0] || 0) + (velocity[2] || 0) * (velocity[2] || 0)) : 0;
            const hold = speed < 0.06 ? 8 : speed > 0.22 ? -12 : 0;
            return (injured ? 32 : 15) + hold;
        }
    });

    PokemonSkills.addPreferences("drainingkiss", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("swoon"), "沉醉之吻", "boolean", {
            help: "开启：回血比例 ×1.22，但威力 ×0.88、贴触多 2 刻、冷却 +5 刻，用来续航。关闭（轻啄）：威力 ×1.12、回血 ×0.9、贴得更快，用来爆发。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动贴上去亲，先走近。越大越愿意追着血线跑。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把吸取之吻当续航手段优先出手；越高越早靠它回血。"
        })
    ]);
}
