/**
 * 吸取之吻 / drainingkiss 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 8）格内；焦点目标不受距离限制。
 *   它是一记纯贴身的续航吸招：`priority` 在自身血量低于 `ai.healBelow`（默认 0.85）时抬一档，
 *   把这一吻当回血手段先用；血量健康时退回普通近身候选取伤害。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 够不到怎么办：射程就是亲吻距离（3 格上下），共享接近逻辑把身位收到吻得到的距离再出手。
 * 放完之后：交回共享顺序；它不占手，下一次决策就能再用。
 */
namespace CompanionBehavior {
    registerUse("drainingkiss", {
        protocols: ["world_combat:attack", "world_combat:contact"],
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
            if (!target || !capability) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const injured = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.85);
            return injured ? 32 : 15;
        }
    });

    PokemonSkills.addPreferences("drainingkiss", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("swoon"), "沉醉之吻", "boolean", {
            help: "开启：回血比例 ×1.22，但威力 ×0.88、起手 +3 刻、冷却 +5 刻，用来续航。关闭（轻啄）：威力 ×1.12、回血 ×0.9、出手快，用来爆发。"
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
