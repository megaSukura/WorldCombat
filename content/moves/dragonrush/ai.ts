/**
 * 龙之俯冲 / dragonrush 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 10）格以内；更远交给共享接近逻辑。
 * 这是一次带落点的俯冲：**头顶有净空、目标又基本停在原地时才最合适**——落点在起跳时锁定，敌群短暂停顿时
 * 才容易砸实；窄室或低矮处天花板压住腾空高度，priority 会大幅压低、优先让给别的招。中距离（3..8 格）正合
 * 适，贴到脸上（1.5 格内）反而容易扑过头。
 * 放完之后：砸中就把对手顶开、可能把它镇住；接着交给共享顺序决定追打还是换招。
 */
namespace PokemonSkills {
    /** 头顶约 3 格是否有净空；没观察到就当作开阔，不拦着伙伴。窄室里天花板会限制弧线高度。 */
    function dragonrushOpen(context: WorldBehavior.Context): boolean {
        const access = CompanionBehavior.world(context);
        const actor = access.actor(CompanionBehavior.source(context).ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return true;
        const position = body.position();
        const block = access.block(CompanionBehavior.point([position.x(), position.y() + body.height() * 0.5 + 3, position.z()]));
        return block === null || String(block.id()).indexOf("air") >= 0;
    }
    /** 目标此刻是否基本停在原地：速度很小，才方便把落点锁在它身上。 */
    function dragonrushStill(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const velocity = CompanionBehavior.velocity(context, target);
        if (velocity === null) return false;
        const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
        return speed < 0.03;
    }
    /** 目标落点周围还挤着几个别的敌人；这一扑本来就照顾落点附近。 */
    function dragonrushClustered(context: WorldBehavior.Context, target: CompanionBehavior.Entity, radius: number): number {
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(dragonrushId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            // 窄室/低矮处腾不起来，先让给别的招；开阔处才正常排序。
            let score = dragonrushOpen(context) ? 18 : 4;
            if (distance >= 3 && distance <= 8) score += 6;
            if (distance <= 1.5) score -= 4;
            // 落点在起跳时锁定：目标基本停住时更容易砸实，快速移动的目标降权。
            score += dragonrushStill(context, target) ? 6 : -4;
            if (dragonrushClustered(context, target, 3.0) > 0) score += 5;
            if (!CompanionBehavior.status(context, target, "flinch")) score += 2;
            return Math.max(0, score);
        }
    });

    addPreferences(dragonrushId, {}, [
        field(pathOf("dread"), "威压式", "boolean", {
            help: "开启：威压圈更大、畏缩更易更久，但俯冲更轻、命中率略低、起手与冷却更久——先镇住再撞。关闭（默认）：迅袭式，砸得更重、命中更稳、扑得更快，威压与畏缩较弱。"
        }),
        field(pathOf("ai.maxChase"), "俯冲距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不俯冲，先走近。龙之俯冲最舒服的是中距离（3..8 格），设得太大常常够不到。"
        })
    ]);
}
