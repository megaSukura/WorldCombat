/**
 * 劈瓦 / brickbreak 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.break`（默认开）在目标被**敌方屏障**护住时抬高优先级——读的是真实的 screen 场与场上带的 screen 身份，
 *   一刀先把落点视线可达的整片敌方屏障震碎；自家与队友的屏不算。关闭则只按威胁与距离排序。够得到就常打。
 */
namespace PokemonSkills {
    /** 目标身边是否有真实存在的敌方 screen 场（或它自己带着 screen 身份）：有就值得先劈。 */
    function brickbreakWarded(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "brickbreak:warded:" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            const point = CompanionBehavior.point(target.point);
            const areas = WorldEffects.areasWithTag(world, WorldEffects.categories.screen, point, 0.5);
            for (let i = 0; i < areas.length; i++) {
                const owner = world.actor(String(areas[i].source));
                // 敌方铺的场（或归属不明的场）视为可拆目标；自家/队友的屏不计。
                if (owner === null || (!world.friendly(owner) && String(owner.ref()) !== String(self.ref))) return true;
            }
            return CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
        });
    }

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
            const warded = brickbreakWarded(context, self, target);
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
            help: "开启：目标被真实存在的敌方反射壁、光墙或极光幕（场或身上身份）护住时优先劈它，先把屏障震碎；自家与队友的屏不算。关闭：只按威胁与距离排序。"
        })
    ]);
}
