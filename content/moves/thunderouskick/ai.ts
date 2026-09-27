/**
 * 雷鸣蹴击 / thunderouskick 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内；更远交给共享接近逻辑。
 * `ai.flank` 开启（默认）时按局面排序：**正忙着攻击别人的目标**或已经贴到 2.5 格内的目标最值
 * （本招会在它分神时多踢开一级护架），还没被踢开的排其次；已经带着破防身份的目标降到很后。
 * 它靠绕步走位；脚只能伸到站位＋伸展，狭窄地形里会自然变成原地短踢或踢空，AI 不为此无限寻路。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    /** 目标左右两侧的侧身落点是否真的有空间：窄道里两侧都堵住时不给绕步加成，退化成原地短踢。 */
    function thunderouskickFlankOpen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), actor = world.source(), foeActor = world.actor(target.ref);
        if (!foeActor) return false;
        const self = world.observe(actor), foe = world.observe(foeActor);
        if (!self || !foe) return false;
        const start = self.position(), centre = foe.position();
        const toward = Math.atan2(start.z() - centre.z(), start.x() - centre.x());
        const bounds = foe.boundsMax().minus(foe.boundsMin());
        for (let sign = -1; sign <= 1; sign += 2) {
            const angle = toward + sign * Math.PI / 3;
            const radial = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle));
            const own = self.boundsMax().minus(self.boundsMin());
            const radius = Math.max(1.5, Math.abs(radial.x()) * (bounds.x() + own.x()) * .5 + Math.abs(radial.z()) * (bounds.z() + own.z()) * .5 + 0.3);
            const spot = WorldCombat.point(centre.x() + radial.x() * radius, start.y(), centre.z() + radial.z() * radius);
            const feet = spot.minus(WorldCombat.point(0, self.height() * 0.5, 0));
            const from = WorldCombat.point(start.x(), self.boundsMin().y(), start.z());
            const path = SurfacePaths.advance(world, from, spot.minus(start), spot.minus(start).length(),
                { up: .1, down: .35, spacing: .2, samples: 40 });
            if (!path.ended && world.freeSpace(feet, self.width(), self.height()) && world.clear(start, spot)) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("thunderouskick", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "flank", true)) return 24;
            if (CompanionBehavior.status(context, target, "guardbroken")) return 10;
            // 没有可行侧路时只会变成一次原地短踢，不如把机会让给别人；窄道里按普通近身攻击排序。
            if (!thunderouskickFlankOpen(context, target)) return 18;
            const busy = (target as any).attacking && (target as any).attacking !== self.ref;
            return busy || distance <= 2.5 ? 38 : 24;
        }
    });

    addPreferences("thunderouskick", {}, [
        field(pathOf("patient"), "戏耍式", "boolean", {
            help: "开启：多绕一步、一次踢开两级护架，但这一脚更轻、起手与冷却更久；关闭：少绕一步、只踢开一级，但出脚更重更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不绕步踢击，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.flank"), "抓分神的人", "boolean", {
            help: "开启：目标正忙着攻击别人、或已经贴到 2.5 格内时优先绕步踢击（分神时多踢开一级），已带破防身份的目标降到最后；两侧都没有可行侧路时按普通近身攻击排序。关闭：一律当普通近身攻击排序。"
        })
    ]);
}
