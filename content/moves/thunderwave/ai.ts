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
 *   目标若对电击/麻痹整体免疫（地面导走电流、电属性免麻痹），这一记同样白放，也降到 0。
 */
namespace PokemonSkills {
    /** 目标是否正在快速移动：速度越快越应该先被麻住。 */
    function thunderwaveSwift(target: CompanionBehavior.Entity): boolean {
        const velocity = target.velocity;
        if (!velocity) return false;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.08;
    }

    /**
     * 目标对电击/麻痹是否整体免疫：地面类型把电流导进地里，电属性对麻痹免疫；
     * 普通生物没有原生类型，只看临时类型层。原生吸收能力不在这里推断。
     */
    function thunderwaveCannotLand(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const published: any = target.facts;
        const native: string[] = published && Array.isArray(published.types) ? published.types : [];
        if (native.indexOf("ground") >= 0 || native.indexOf("electric") >= 0) return true;
        const stats: any = CompanionBehavior.combatStats(context, target);
        const current: string[] = stats && Array.isArray(stats.types) ? stats.types : [];
        return current.indexOf("ground") >= 0 || current.indexOf("electric") >= 0;
    }

    /**
     * 自己到目标这条三维直线上有没有己方身体：有的话电流会在半路被引走，麻痹落不到目标身上。
     * 用双方身体中心连线与同伴真实碰撞箱（宽/高）判断，不再只按 XZ 投影估，跨楼层与窄体/大体都不误判。
     */
    function thunderwaveAllyBlocked(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (!self.point || !target.point) return false;
        const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
        if (to.minus(from).length() < 0.5) return false;
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.ref === String(context.actor) || other.ref === target.ref || !other.point) continue;
            const centre = CompanionBehavior.point(other.point);
            const closest = WorldGeometry.closestOnSegment(centre, from, to);
            // 只有严格落在施法者与目标之间的身体才会截线。
            if (closest.minus(from).length() <= 0.3 || closest.minus(to).length() <= 0.3) continue;
            const dx = closest.x() - centre.x(), dz = closest.z() - centre.z();
            const horizontal = Math.sqrt(dx * dx + dz * dz), vertical = Math.abs(closest.y() - centre.y());
            const halfWidth = (typeof other.width === "number" && isFinite(other.width) ? other.width : 0.9) / 2;
            const halfHeight = (typeof other.height === "number" && isFinite(other.height) ? other.height : 1.4) / 2;
            if (horizontal <= halfWidth + 0.25 && vertical <= halfHeight + 0.25) return true;
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
            if (thunderwaveCannotLand(context, target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 10)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "paralysis")) return 0;
            if (thunderwaveCannotLand(context, target)) return 0;
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
