/**
 * 三旋击 / tripleaxel 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 4）格以内；这是近身招，更远先走近。
 * 对谁出手：当前威胁；横扫式下身旁的目标也会一起被扫到，但排序仍以当前目标为准。
 * 前侧空间：滑步旋身需要身前与至少一侧有空位（原生空域探针），朝墙夹住时降权——撞墙会提前收势。
 * 多敌：扇弧内站了不止一个敌人时抬高优先级，一次旋踢的价值随人数上升。
 * 放完之后：三脚踢完交回共享交战计划；带着冷却时不会重复起旋。
 */
namespace PokemonSkills {
    /** 身前有落脚位、且左右至少一侧能旋：滑步旋身的前提；被墙夹住时降权。按决策帧缓存一次。 */
    function tripleaxelRoom(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_tripleaxel/room/" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            if (typeof (world as any).freeSpace !== "function") return true;
            const self = CompanionBehavior.source(context);
            const actor = world.actor(self.ref);
            const body = actor === null ? null : world.observe(actor);
            if (body === null) return true;
            const at = body.position();
            const width = Math.max(0.4, body.width()), height = Math.max(0.6, body.height());
            const dx = target.point[0] - at.x(), dz = target.point[2] - at.z();
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.4) return true;
            const ux = dx / length, uz = dz / length, sideX = -uz, sideZ = ux;
            const front = CompanionBehavior.point([at.x() + ux * 1.5, at.y(), at.z() + uz * 1.5]);
            const left = CompanionBehavior.point([at.x() + sideX * 1.2, at.y(), at.z() + sideZ * 1.2]);
            const right = CompanionBehavior.point([at.x() - sideX * 1.2, at.y(), at.z() - sideZ * 1.2]);
            return world.freeSpace(front, width, height) && (world.freeSpace(left, width, height) || world.freeSpace(right, width, height));
        });
    }
    /** 扇弧射程内站着的其他敌人数量：越多越值得一次横扫。 */
    function tripleaxelCrowd(context: WorldBehavior.Context, reach: number): number {
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        const self = CompanionBehavior.source(context);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= reach + 1.4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(tripleaxelId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (tripleaxelCrowd(context, capability.data.range) >= 2) score += 14;
            if (!tripleaxelRoom(context, target)) score -= 10;
            return Math.max(6, score);
        }
    });

    addPreferences(tripleaxelId, {}, [
        flag("widen", "横扫"),
        number("ai.maxChase", "出手距离", 2, 8, 1)
    ]);
}
