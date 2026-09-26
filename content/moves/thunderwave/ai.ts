/**
 * 电磁波 / Thunder Wave — 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带电磁波的伙伴在没有攻击可用时用它。对还没被麻痹、可见、敌对、
 *   还活着且在 ai.maxChase 以内、中间有一条通视线的目标出手；被墙挡住的先交给共享接近逻辑，走近了再放。
 * 对谁出手：当前威胁；已经麻痹的目标不重复下手，把机会留给别的控制手段。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒。
 * 放完之后：目标移动变慢、有 25% 概率失手，伙伴交回共享顺序继续交战。
 * 优先级：基础 50；ai.preferSwift 开启时，正在快速移动的目标（先冲上来的那个）抬到 65，先把它钉住；
 *   自己到目标这条线上若已有同伴身体，电流会被引走、这记基本白放，降到 0 让给别的控制手段。
 */
namespace PokemonSkills {
    /** 目标是否正在快速移动：速度越快越应该先被麻住。 */
    function thunderwaveSwift(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    /** 自己到目标这条直线上有没有己方身体：有的话电流会在半路被引走，麻痹落不到目标身上。 */
    function thunderwaveAllyBlocked(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.5) return false;
        const ux = dx / span, uz = dz / span;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.ref === String(context.actor) || other.ref === target.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along <= 0.3 || along >= span - 0.3) continue;
            if (Math.abs(ox * uz - oz * ux) <= 0.6) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(thunderwaveId, {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "paralysis")) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "paralysis")) return 0;
            if (thunderwaveAllyBlocked(context, target)) return 0;
            return CompanionBehavior.ai<boolean>(capability, "preferSwift", true) && thunderwaveSwift(target) ? 65 : 50;
        }
    });

    addPreferences(thunderwaveId, {}, [
        field(pathOf("surge"), "蓄长", "boolean", {
            help: "开启：射程 ×1.3、麻痹 ×1.2，但起手多 3 刻、冷却 ×1.25，用来隔远了点住跑得快的目标；关闭：快放式，射程 ×0.9、麻痹 ×0.9，换来更短的起手与冷却，贴身乱战里更跟得上。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动放电，先走近。越大越执着追击，也越容易在间隔太远时被走过低头。"
        }),
        field(pathOf("ai.preferSwift"), "优先麻快目标", "boolean", {
            help: "开启后，正在快速移动的目标优先级抬到 65，先把冲上来的那个钉住；关闭则所有威胁一视同仁。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为放电离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
