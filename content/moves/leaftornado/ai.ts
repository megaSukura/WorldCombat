/**
 * 青草搅拌器 的伙伴 AI 用途：一套自己的出手计划。
 *
 * 什么局面下出手：有可见威胁、在 `ai.maxChase` 之内。`ai.crowd`（默认开）让它检查目标身边有多少敌人：
 * 能围住两个以上时 priority 明显抬高，因为旋风是持续的区域切割，罩得越多越值；只有单个目标时按普通攻击排序。
 * 对谁出手：当前威胁；不可见、友方或已倒下的目标不接受。旋风是留在原地的区域，所以站定/慢速的敌人更值；
 *   走得快的目标预期会很快离开切割圈，priority 反而下调。`ai.lead` 允许把旋风提前放在移动目标的去路上。
 * 够不到怎么办：reach 就是落点射程，不够就先走近；`ai.leaveStation` 决定驻守时是否离位。
 * 放完之后：旋风在原地继续切，伙伴交回共享顺序继续战斗，被罩住的敌人需要自己走开。
 * 选取是 point：玩家可提前放在空地/走道，AI 仍只为攻击用途推荐敌人，两者分开处理。
 */
namespace PokemonSkills {
    function leaftornadoWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    CompanionBehavior.registerUse("leaftornado", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return leaftornadoWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        /** 提前量：把旋风放在移动目标下一刻要经过的位置，拦在走道上，而不是它此刻站的地方。 */
        target: function (context, capability, selected) {
            const lead = CompanionBehavior.ai<number>(capability, "lead", 0), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !leaftornadoWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let base = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                base += leaftornadoStay(target);
                return base;
            }
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let caught = 1;
            for (let i = 0; i < nearby.length && caught < 5; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || other.ref === self.ref || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3.6) caught++;
            }
            if (caught >= 2) base += 18;
            return base + leaftornadoStay(target);
        }
    });

    /** 站定/慢速的敌人更可能留在切割圈里；走得快的预期很快离区，降分。 */
    function leaftornadoStay(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!velocity) return 0;
        const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
        if (speed <= 0.02) return 12;
        if (speed > 0.09) return -8;
        return 0;
    }

    addPreferences("leaftornado", {}, [
        field(pathOf("ai.maxChase"), "施放距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不主动立旋风，先走近。越大越愿意在更远处先手罩住目标。"
        }),
        field(pathOf("ai.crowd"), "围住多个", "boolean", {
            help: "开启后，目标身边还有别的敌人时优先立旋风，持续切割能多打几份；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.lead"), "提前量", "number", {
            min: 0, max: 20, step: 1,
            help: "对移动中的目标提前这么多刻落点，把旋风拦在它要走的路上；0 表示直接放在目标当前位置，越大越适合拦冲过来的对手。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找落点离开站位；关闭则只在原地够得到时立旋风。"
        })
    ]);
}
