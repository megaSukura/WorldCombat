/**
 * 怒牛 / ragingbull 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.crowd`（默认开）在目标身边还挤着别的敌人时抬高优先级——这一冲能一路撞穿多人；
 * 目标带着反射壁、光墙或极光幕时也抬高一档，冲势会顺手把屏障震碎。关闭则只按威胁与距离排序。
 * 放完之后继续常规交战。
 */
namespace PokemonSkills {
    function ragingbullCrowd(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("ragingbull", {
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
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const warded = CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
            const crowd = CompanionBehavior.ai<boolean>(capability, "crowd", true) ? ragingbullCrowd(context, target) : 0;
            return 20 + (crowd >= 2 ? 18 : crowd >= 1 ? 8 : 0) + (warded ? 10 : 0);
        }
    });

    addPreferences("ragingbull", {}, [
        field(pathOf("trample"), "贯穿式", "boolean", {
            help: "开启：一路撞穿、最多撞到四个目标，顶得更开、碎壁更广，但每一下 ×0.9、冷却 +8 刻；关闭：猛停式，只撞第一个目标、单下 ×1.1，顶得更近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动冲锋，先走近。越大越愿意从稍远处先手冲撞。"
        }),
        field(pathOf("ai.crowd"), "撞人多的一边", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先冲它，让路线撞到更多人；关闭：只按威胁与距离排序。"
        })
    ]);
}
