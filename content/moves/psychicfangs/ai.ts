/**
 * 精神之牙 / psychicfangs 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.eatBarrier`（默认开）在**沿牙路真实存在敌方屏障**时抬高优先级——读的是牙路（自身到目标）真正能碰到的
 * screen 场，以及目标自己带着的反射壁／光墙／极光幕身份；自家与队友的屏不算。关闭则只按威胁与距离排序。
 * 单体厚血目标不需要被推动也能吃满主咬。放完之后继续常规交战。
 */
namespace PokemonSkills {
    /** 点到线段的 3D 距离；用于判断牙路是否真的经过某片屏障。 */
    function psychicfangsSegmentDistance(from: number[], to: number[], point: number[]): number {
        var dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], lengthSquared = dx * dx + dy * dy + dz * dz;
        if (lengthSquared < 1e-9) return CompanionBehavior.distance(from, point);
        var t = ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy + (point[2] - from[2]) * dz) / lengthSquared;
        t = Math.max(0, Math.min(1, t));
        return CompanionBehavior.distance([from[0] + dx * t, from[1] + dy * t, from[2] + dz * t], point);
    }
    /** 沿牙路（自身→目标）能碰到的敌方 screen 场，或目标自己带的屏障身份。 */
    function psychicfangsWarded(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "psychicfangs:warded:" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            const areas = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
            for (let i = 0; i < areas.length; i++) {
                const owner = world.actor(String(areas[i].source));
                if (owner !== null && (String(owner.ref()) === String(self.ref) || world.friendly(owner))) continue;
                const centre = [areas[i].position[0], areas[i].position[1], areas[i].position[2]];
                if (psychicfangsSegmentDistance(self.point, target.point, centre) <= areas[i].radius + 0.6) return true;
            }
            return CompanionBehavior.status(context, target, "reflect")
                || CompanionBehavior.status(context, target, "lightscreen")
                || CompanionBehavior.status(context, target, "auroraveil");
        });
    }

    CompanionBehavior.registerUse("psychicfangs", {
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
            const warded = psychicfangsWarded(context, self, target);
            if (CompanionBehavior.ai<boolean>(capability, "eatBarrier", true) && warded) return 42;
            return warded ? 24 : 18;
        }
    });

    addPreferences("psychicfangs", {}, [
        field(pathOf("devour"), "噬壁式", "boolean", {
            help: "开启：每碎一层屏障的加成 ×1.7、碎壁范围 ×1.25，但基础咬击 ×0.9、冷却 +8 刻；关闭：穿刺式，基础咬击 ×1.08、吞壁加成 ×0.6。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑咬，先走近。越大越愿意从稍远处先手咬壁。"
        }),
        field(pathOf("ai.eatBarrier"), "先吃屏障", "boolean", {
            help: "开启：目标带着反射壁、光墙或极光幕时优先咬它，把屏障咬碎吞成额外力道；关闭：只按威胁与距离排序。"
        })
    ]);
}
