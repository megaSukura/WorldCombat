/**
 * 怒牛 / ragingbull 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.crowd`（默认开）按**从自身到目标这条实际冲锋路线**数敌人与光幕，而不是目标身边的一圈：
 * 线敌人或屏走廊会给这一冲更多收获；目标自己带着反射壁、光墙或极光幕时也抬高一档。
 * 关闭则只按威胁与距离排序。放完之后继续常规交战。
 */
namespace PokemonSkills {
    function ragingbullLine(context: WorldBehavior.Context, target: CompanionBehavior.Entity): { enemies: number; screens: number } {
        const self = CompanionBehavior.point(CompanionBehavior.source(context).point);
        const victim = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(victim.minus(self));
        const span = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        let enemies = 0;
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            const delta = CompanionBehavior.point(other.point).minus(self);
            const along = WorldGeometry.dot(delta, heading);
            if (along < 0 || along > span + 2) continue;
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const perp = Math.sqrt(Math.max(0, flat.length() * flat.length() - along * along));
            if (perp <= 2.2) enemies++;
        }
        let screens = 0;
        const world = CompanionBehavior.world(context);
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let i = 0; i < zones.length; i++) {
            const at = CompanionBehavior.point(zones[i].position);
            const delta = at.minus(self);
            const along = Math.max(0, Math.min(span, WorldGeometry.dot(delta, heading)));
            const closest = self.plus(heading.scale(along));
            const flat = at.minus(closest);
            const perp = Math.sqrt(flat.x() * flat.x() + flat.z() * flat.z());
            if (perp <= zones[i].radius + 1.5) screens++;
        }
        return { enemies: enemies, screens: screens };
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
            const line = CompanionBehavior.ai<boolean>(capability, "crowd", true) ? ragingbullLine(context, target) : { enemies: 0, screens: 0 };
            return 20 + (line.enemies >= 2 ? 18 : line.enemies >= 1 ? 8 : 0) + (line.screens >= 1 ? 12 : 0) + (warded ? 10 : 0);
        }
    });

    addPreferences("ragingbull", {}, [
        field(pathOf("trample"), "贯穿式", "boolean", {
            help: "开启：一路撞穿、最多撞到四个目标，顶得更开、撞中震壁更广，但每一下 ×0.9、冷却 +8 刻；关闭：猛停式，只撞第一个目标、单下 ×1.1，顶得更近。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动冲锋，先走近。越大越愿意从稍远处先手冲撞。"
        }),
        field(pathOf("ai.crowd"), "撞成线的一边", "boolean", {
            help: "开启：按从自身到目标这条实际冲锋路线上的敌人数排序，线敌人或屏走廊更优先；关闭：只按威胁与距离排序。"
        })
    ]);
}
