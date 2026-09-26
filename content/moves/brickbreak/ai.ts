/**
 * 劈瓦 / brickbreak 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.break`（默认开）在目标带着反射壁、光墙或极光幕时抬高优先级——把这一记留给张着屏障的对手，
 * 一刀先把落点视线可达的整片屏障震碎；关闭则只按威胁与距离排序。够得到就常打。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("brickbreak", {
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
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const warded = CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
            if (CompanionBehavior.ai<boolean>(capability, "break", true) && warded) return 40;
            return warded ? 22 : 16;
        }
    });

    addPreferences("brickbreak", {}, [
        field(pathOf("wide"), "裂瓦式", "boolean", {
            help: "开启：劈面与碎壁范围更大、一次能劈到走廊里更多人，但单发威力略低、起手与冷却更久；关闭：寸劲式，一记更准更狠的单体劈斩。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动上劈，先走近。越大越愿意从稍远处先手碎壁。"
        }),
        field(pathOf("ai.break"), "优先碎壁", "boolean", {
            help: "开启：目标带着反射壁、光墙或极光幕时优先劈它，先把屏障震碎；关闭：只按威胁与距离排序。"
        })
    ]);
}
