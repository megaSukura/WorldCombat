/**
 * 气旋攻击 / aeroblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 20）格内。它是本族射程最远、钉住一条
 *   射线只打首敌的招，所以越远越先被考虑（在对手进入自己射程前先手压束）；贴身后仍然可用，但让位给更便宜
 *   的近战。`ai.finishLow`（默认开）在对手血量偏低时抬优先级，用这一束尝试收掉。细束打不散横向铺开的敌群，
 *   当首敌左右还挤着多个横向错开的敌人时降权，把范围留给空气利刃这类扇面招。
 * 放完之后：交回共享交战计划；它是站定的单体远程，掷完不改变站位。
 */
namespace PokemonSkills {
    /** 首敌近旁、横向错开、细束扫不到的敌人数量（供单体远程降权）。 */
    function aeroblastSpread(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 0;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible || other.ref === self.ref || other.ref === target.ref) continue;
            const dx = other.point[0] - target.point[0], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) > 5) continue;
            if (Math.abs(dx * uz - dz * ux) > 1.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(aeroblastId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                    <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > Number(capability.data.range)) return 0;
            let base = distance > 8 ? 32 : 22;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.4) base += 18;
            // 横向铺开的敌群细束只能打到一个：降权，交给空气利刃那样的扇面招。
            const spread = aeroblastSpread(context, target);
            if (spread >= 3) base -= 10;
            else if (spread >= 2) base -= 5;
            return Math.max(10, base);
        }
    });

    addPreferences(aeroblastId, {}, [
        field(pathOf("charge"), "蓄力式", "boolean", {
            help: "开启：威力 ×1.18、射程 +2.5 格、涡流判定 ×1.15、气环 ×1.1，但起手 +6 刻、收招 +2 刻、冷却 +14 刻、飞行 ×0.9，适合预判远距目标。关闭（速射式，默认）：飞得更快（×1.12）、冷却少 8 刻，但威力 ×0.94、射程略短，适合贴身也敢放。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 28, step: 1,
            help: "超过这个距离就不主动出手，先走近。它是本族射程最远的招，数值大时会在远处先手开炮。"
        }),
        field(pathOf("ai.finishLow"), "收残血", "boolean", {
            help: "开启：对手血量低于四成时优先打这一发重炮，尝试收掉；关闭：不看血量，按普通远程排序。"
        })
    ]);
}
