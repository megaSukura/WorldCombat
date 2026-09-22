/**
 * 幻象光线 / psybeam —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.fresh`（默认开）打开时，已经带着共享恍惚身份的目标排后；`ai.line`（默认关）打开且开了回响时，
 *   目标身后还连着别的敌人排前——一束紫光能穿两个。
 * 够不到怎么办：reach 就是本招射程，不够先走近。
 * 放完之后：交回共享交战计划；恍惚期间目标每次想反打都可能被幻影再缠一层。
 */
namespace PokemonSkills {
    function psybeamWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
    }

    /** 目标身后是否还连着别人：粗略判断目标背后 3 格内有没有另一个敌人。 */
    function psybeamBehind(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (!CompanionBehavior.ai<boolean>(capability, "line", false)) return false;
        const self = CompanionBehavior.source(context), nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1, ux = dx / length, uz = dz / length;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - target.point[0], oz = other.point[2] - target.point[2];
            const along = ox * ux + oz * uz, side = Math.abs(ox * -uz + oz * ux);
            if (along > 0.4 && along <= 3 && side <= 1.2) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(psybeamId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psybeamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psybeamWants(context, capability, target)) return 0;
            let score = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "fresh", true) && CompanionBehavior.status(context, target, "confusion")) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 8);
            if (psybeamBehind(context, capability, target)) score += 8;
            return score;
        }
    });

    addPreferences(psybeamId, { ai: { maxChase: 16, fresh: true, finish: true, line: false } }, [
        field(pathOf("echo"), "回响", "boolean", {
            help: "开启：紫光命中后继续穿行去打第二个目标、转向更死、恍惚更久，但单发 ×0.86、弹速更慢、起手 +3 刻、冷却 +6 刻，适合敌群成线。关闭（单影）：更快更重的一束，只打一个，代价是不会穿。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动发射，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.fresh"), "先打没恍惚的", "boolean", {
            help: "开启：已经带着共享恍惚身份的目标排后，把这一发留给还清醒的对手；关闭则所有目标同价。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前，用它收尾；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.line"), "优先串成一线的目标", "boolean", {
            help: "开启且本招为回响时，目标身后还连着别的敌人就排前，让一束紫光穿两个；关闭则只看单个目标。"
        })
    ]);
}
