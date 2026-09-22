/**
 * 暗影拳 / shadowpunch 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.grounding`（默认开）：目标不在地面（浮空）时降低 priority——暗影贴地爬过去，浮空的对手不划算；
 * 站定的对手按普通近战排序。
 * 配置 hold（地缚／背刺）在「拖住对手的控制」与「更重的一拳」之间取舍。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shadowpunch", {
        protocols: ["world_combat:attack"],
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
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let base = gap <= capability.data.range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "grounding", true) && target.grounded === false) base -= 8;
            return base;
        }
    });

    addPreferences("shadowpunch", { hold: false, ai: { maxChase: 12, grounding: true } }, [
        field(pathOf("hold"), "地缚", "boolean", {
            help: "开启（地缚）：影子拳抓住对手并把它拖向自己，制造控制，但拳力约 −15%。关闭（背刺）：不放慢、不加拖拽，一拳约 +18%。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "目标在这个距离内才考虑暗影拳；调大愿意对更远的对手出拳。"
        }),
        field(pathOf("ai.grounding"), "只打落地的对手", "boolean", {
            help: "开启后，浮空的敌人优先级降低（暗影贴地爬过去不划算）；关闭则不看对方是否落地。"
        })
    ]);
}
