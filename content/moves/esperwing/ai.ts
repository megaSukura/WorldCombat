/**
 * 气场之翼 / esperwing 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）格以内；身上还有气翼余韵时不出手，
 *   等余韵走完（余韵本身就是提速窗口，重复振翅浪费 PP）。
 * 对谁出手：`ai.boostFirst`（默认开）打开时，自己还没提速、又有威胁在近处，就把这一记当「攻击 + 垫速」
 *   一起打出去，优先级抬高；面前两侧都有威胁时也抬高——两翼各扫一侧，一记能同时应付两边。
 * 放完之后：速度等级已写进公共能力阶梯，余韵期间不再重复振翅，把 PP 留给别的事。
 */
namespace PokemonSkills {
    /** 面前两侧的威胁分布：以目标方向为中轴，各统计 `reach` 内的可见敌人。 */
    function esperwingSides(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): { left: number; right: number; both: boolean } {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 3.2;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const hx = length < 0.01 ? 1 : dx / length, hz = length < 0.01 ? 0 : dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let left = 0, right = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            if (Math.sqrt(ox * ox + oz * oz) > reach + 0.5) continue;
            const side = ox * -hz + oz * hx;
            if (side < -0.4) left++;
            else if (side > 0.4) right++;
        }
        return { left: left, right: right, both: left > 0 && right > 0 };
    }

    CompanionBehavior.registerUse(esperwingId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability, purpose) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "esperwing")) return false;
            if (CompanionBehavior.recent(context, "move", esperwingId, 200)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(self.point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range + 0.8) return 0;
            const boosting = CompanionBehavior.ai<boolean>(capability, "boostFirst", true);
            let score = boosting ? 88 : 26;
            if (esperwingSides(context, capability, target).both) score = Math.max(score, boosting ? 92 : 44);
            return score;
        }
    });

    const esperwingChase = number("ai.maxChase", "出手距离", 2, 12, 1);
    esperwingChase.help = "超过这个距离不主动振翅，先走近；越大越愿意从稍远处扫出去并顺手提速。";
    const esperwingFirst = flag("ai.boostFirst", "先手垫速");
    esperwingFirst.help = "开启：自己还没提速时把这一记当攻击加垫速来用，优先级抬到共享交战之前；关闭：只当普通近战排序。";

    addPreferences(esperwingId, { flap: false, ai: { maxChase: 6, boostFirst: true } },
        [esperwingChase, esperwingFirst]);
}
