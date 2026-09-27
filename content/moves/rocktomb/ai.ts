/**
 * 岩石封锁 / rocktomb 的 AI 用途。
 *
 * 选取是 aim：玩家可自由点方向，AI 仍按仇恨为攻击用途推荐敌人。什么局面下出手：对手可见、敌对、还活着，
 * 且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。`ai.sealRunner` 开启（默认）时按局面排序：
 * 目标正在移动/逃跑时最值（围栏就是为追身准备的），站在可替换地面上、还没被封的排其次；脚下地表改变不了、
 * 已带着封锁身份、或离地的目标依次降到更后（重复封没有意义，围不住的目标只剩普通投石）。围栏需要可替换地面：
 * 地形被保护时只会碎成石屑、限时减速照旧，所以它仍是有用的中距离攻击，只是断续拦阻的价值降低。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    /** 目标脚下的地表是否能被围栏替换：读真实方块，决定这一发能否真的封住，而不只看它是否落地。 */
    function rocktombGroundCageable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const feet = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const surface = WorldGeometry.ground(world, feet, 5);
        if (surface.minus(feet).length() < 0.01) return false;
        const block = world.block(WorldCombat.point(Math.floor(surface.x()), Math.floor(surface.y()) - 1, Math.floor(surface.z())));
        return block !== null && rocktombSurface(String(block.id())) !== "";
    }

    CompanionBehavior.registerUse("rocktomb", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "sealRunner", true)) return 22;
            if (CompanionBehavior.status(context, target, "encased")) return 8;
            if (target.grounded === false) return 10;
            // 脚下地表改不了（木头、树叶、受保护方块等）时立不起石栏，只剩一次普通投石；仍可用，但排在能真封住的目标之后。
            if (!rocktombGroundCageable(context, target)) return 16;
            return CompanionBehavior.fleeing(context, target) ? 40 : 22;
        }
    });

    addPreferences("rocktomb", {}, [
        field(pathOf("trap"), "封场式", "boolean", {
            help: "开启：围栏更宽更高、压两级速度、石头留得更久，但单发更轻；关闭：砸得更重、只压一级、围栏短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不投石封锁，先走近。越大越愿意从稍远处先手封人。"
        }),
        field(pathOf("ai.sealRunner"), "封跑动的人", "boolean", {
            help: "开启：目标正在移动或逃跑时优先投石，未落地的目标与已被封的目标降到最后；关闭：当普通中距离攻击排序。"
        })
    ]);
}
