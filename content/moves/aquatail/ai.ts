/**
 * 水流尾 / aquatail 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 9）之内；更远交给共享接近逻辑。
 * 对谁出手：这是一片贴近身前的弧形水墙。`ai.pointBlank`（默认开）打开时，越贴到脸上的目标优先级越高——
 *   把顶着自己的人连同身位一起推开，正是它最值的用法；面前弧面里挤着多人时再抬价，一次拍开一排。
 *   关闭 pointBlank 时仍按身前多敌抬价，只是不再因贴身额外加价。
 * 够不到怎么办：尾长交给 `reach`，共享任务把身位收进弧面之后再抡。
 * 放完接什么：交回共享交战计划；被拍中的人带着湿身身份、也被推离，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    /** 以目标方向为中线，数一数弧面里还挤着几个非友方（含目标），按本个体真实的浪张角。 */
    function aquatailFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length, range = capability.data.range;
        const arc = p(aquatailId, "arc", CompanionBehavior.world(context));
        const cosHalf = Math.cos(Math.min(180, Math.max(5, arc)) * Math.PI / 360);
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > range || distance < 1e-6) continue;
            if ((ox / distance) * ux + (oz / distance) * uz >= cosHalf - 1e-12) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(aquatailId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point), range = capability.data.range;
            if (gap > range) return 0;
            let value = 26;
            if (CompanionBehavior.ai<boolean>(capability, "pointBlank", true) && gap <= range * 0.7) value += 12;
            const crowd = aquatailFront(context, capability, target);
            if (crowd >= 2) value += Math.min(crowd - 1, 3) * 5;
            return value;
        }
    });

    addPreferences(aquatailId, {}, [
        field(pathOf("heavy"), "沉浪", "boolean", {
            help: "开启：威力 ×1.12、推开 ×1.2，但推进拍数 +1（浪更慢、更好躲）、起手多 2 刻、冷却多 4 刻；关闭：更快的一浪，更容易在对手走出扇面前拍到。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不抡尾，先走近；越大越愿意从更远处起浪。"
        }),
        field(pathOf("ai.pointBlank"), "贴着才抡", "boolean", {
            help: "开启：越贴到脸上的目标优先级越高，用这一浪把它连同身位推开；关闭则按普通近身攻击排序。"
        })
    ]);
}
