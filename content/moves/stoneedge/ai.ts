/**
 * 尖石攻击 / stoneedge 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 11）之内，并且从自己到对手之间没有方块挡住
 *   （脊要沿地面裂过去，一堵墙就断了这条路）。更远交给共享接近逻辑。
 * 对谁出手：这是一条从脚下裂向对手的直线，所以够远时更值——`ai.snipe`（默认开）在对手离自己超过射程六成时
 *   抬高一档，趁对方还没贴上来先把缝裂过去；沿线真实地表可用范围足够才抬高，断口或过陡台阶会拉低推荐；
 *   站在地面上的目标优先，悬空目标让位。贴身的目标让位给更快的近身招。
 * 够不到怎么办：裂线长度交给 `reach`，共享任务把身位收进射程内再裂。
 * 放完接什么：交回共享交战计划；被刺中的人脚下留着会合上的裂痕，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    function stoneedgeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    /** 某一列承载石刺的地表顶面高度，读取方式与招式执行一致；找不到可站立自然地表时返回 null。 */
    function stoneedgeProbe(world: CombatWorld, x: number, z: number, baseY: number): number | null {
        for (var y = Math.floor(baseY + 1.6); y >= Math.floor(baseY - 4); y--) {
            var block = world.block(CompanionBehavior.point([x + 0.5, y, z + 0.5]));
            if (block === null) return null;
            var id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:bedrock" || id === "minecraft:barrier"
                || id === "minecraft:water" || id === "minecraft:lava") return null;
            return y + 1;
        }
        return null;
    }

    /** 从自己到对手之间真实地表是否连续到射程内；同一决策帧只探一次。 */
    function stoneedgeLineHolds(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_stoneedge/ground:" + target.ref, function () {
            var world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            var dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            var length = Math.sqrt(dx * dx + dz * dz), reach = Math.max(2.5, item.data.range);
            if (!(length > 0.5)) return true;
            var span = Math.min(length, reach), steps = Math.max(3, Math.min(12, Math.ceil(span / 0.8)));
            var previous: number | null = stoneedgeProbe(world, Math.floor(self.point[0]), Math.floor(self.point[2]), self.point[1]);
            if (previous === null) return false;
            for (var i = 1; i <= steps; i++) {
                var t = i / steps;
                var gy = stoneedgeProbe(world, Math.floor(self.point[0] + dx / length * span * t), Math.floor(self.point[2] + dz / length * span * t), previous);
                if (gy === null || Math.abs(gy - previous) > 1.6) return false;
                previous = gy;
            }
            return true;
        });
    }

    CompanionBehavior.registerUse(stoneedgeId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context) {
            const target = CompanionBehavior.goalEntity(context);
            if (!target) return true;
            const world = context.services.world, self = CompanionBehavior.source(context);
            const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
            const delta = to.minus(from), length = delta.length();
            if (length < 0.5) return true;
            return world.clear(from.plus(delta.unit().scale(0.5)), to);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return stoneedgeWants(context, capability, target as CompanionBehavior.Entity);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !stoneedgeWants(context, capability, target as CompanionBehavior.Entity)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            let base = 20;
            // 地表连续到射程内才裂得过去；断口、高墙或过陡台阶拉低推荐。
            if (!stoneedgeLineHolds(context, capability, target as CompanionBehavior.Entity)) base -= 10;
            // 脊是沿地面裂的，站在地上的目标优先；悬空目标让位。
            if (target.grounded === false) base -= 8;
            if (!CompanionBehavior.ai<boolean>(capability, "snipe", true)) return Math.max(0, base);
            return (gap > capability.data.range * 0.6 ? base + 9 : base);
        }
    });

    addPreferences(stoneedgeId, {}, [
        field(pathOf("wide"), "散刺式", "boolean", {
            help: "开启：脊带铺宽 1.8 倍、石刺段数 +2，一条缝罩住并排的人，代价是威力 ×0.9、裂线更短、起手与冷却更久。关闭：尖刺式，窄而长的一条缝，威力 ×1.06、射程 ×1.1，但只能刺到线正上的人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不裂地，先走近。越大越愿意从更远处先手，目标也越有时间在石刺顶到之前横移出脊带。"
        }),
        field(pathOf("ai.snipe"), "远程优先", "boolean", {
            help: "开启：对手离自己超过射程六成时优先裂地，把远距离目标先手逼开；关闭：只按普通攻击排序，贴身后也一样会裂。"
        })
    ]);
}
