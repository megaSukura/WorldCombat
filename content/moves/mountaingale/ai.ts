/**
 * 冰山风 / mountaingale 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 15）格内。它是全家的远程重击，
 * 所以够远时最先被考虑（趁对手还没贴上来先砸一记），贴身后让位给更快的近身招。
 * `ai.opening`（默认「只对未畏缩目标」）跳过已经被别的招顶懵的人——这一记又慢又重，砸在懵住的人身上浪费。
 *
 * 本招是 `kind: "point"`：AI 用敌人的当前位置作为落点。落点慢、站定（水平速度低）的敌人更值得砸；
 * 目标真实站在地面、头顶没有方块压着时，落点还能立起冰锥当掩体，这类目标再抬一档。
 * 快速移动的敌人照样可砸，但优先级低，落点更容易被它走开。畏缩与冰柱只是附加，伤害照常结算。
 */
namespace PokemonSkills {
    /** 目标脚下能否立起冰柱：真正站在地面且柱体空间上方无实体方块，冰锥才形成有用掩体。 */
    function mountaingaleCover(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.grounded === false) return false;
        const world = CompanionBehavior.world(context), at = CompanionBehavior.point(target.point);
        const feet = WorldCombat.point(at.x(), at.y() - (target.height || 1.4) / 2, at.z());
        if (SurfacePaths.support(world, feet, 0.6, 1.6) === null) return false;
        return world.clear(feet, feet.plus(WorldCombat.point(0, 1.5, 0)));
    }

    function mountaingaleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 15)) return false;
        var opening = CompanionBehavior.ai<string>(item, "opening", "fresh");
        return opening !== "fresh" || !CompanionBehavior.status(context, target, "flinch");
    }

    CompanionBehavior.registerUse("mountaingale", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return mountaingaleWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !mountaingaleWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            // 站定／慢速目标更可能被冰障压在原地，优先砸；快目标可用但排后面。
            const velocity = target.velocity || [0, 0, 0];
            const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
            const settled = speed < 0.03 ? 12 : speed < 0.10 ? 6 : 0;
            // 落点还能立起冰锥当掩体时再抬一档；飞空或被方块压住的目标不拿这份分。
            const cover = mountaingaleCover(context, target) ? 6 : 0;
            return (distance > 6 ? 38 : 24) + settled + cover;
        }
    });

    addPreferences("mountaingale", {}, [
        field(pathOf("glacier"), "冰山式", "boolean", {
            help: "开启：冰块更重（主伤 ×1.10）、碎裂范围更大（×1.15）、下落更快，但飞得更慢、起手、收招与冷却更久。关闭：碎冰式，主伤与碎裂范围更小，抛得更平更快、出手更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动投冰，先走近。越大越会在远处先手，但飞行更久、目标更容易让开落点。"
        }),
        field(pathOf("ai.opening"), "起手目标", "choice", {
            options: [
                { value: "fresh", label: "只对未畏缩目标" },
                { value: "always", label: "随时" }
            ],
            help: "只对未畏缩目标：跳过已经被别的招顶懵的人，把这一记留给还能被砸懵的目标。随时：把它当普通攻击，不挑目标状态。"
        })
    ]);
}
