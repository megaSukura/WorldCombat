/**
 * 雪崩 / avalanche 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 9）格内时列入候选；够不到交给共享接近逻辑。
 * 地形判断放在只读世界入口 `CompanionBehavior.world(context)` 上：**从真实脚底**沿自身→目标这条实际滑行路线
 *   用与招式同一条共享地表采样（`avalancheGround` → `SurfacePaths.support`，原生向上顶面）量出雪体还能推进多远。
 *   前方过早遇到实墙/上台阶或断崖（`cleared` 太小）时压到最低。
 * 排序：`ai.crumble`（默认开）打开且自己带着「被打懵」积伤（正是翻倍窗口）时，**也先检查路径**：路线够长才抬到 53，
 *   第一步就撞墙/遇崖则退回普通档，不朝高墙浪费一整记；否则前方一路可达目标且雪带里被围住（两个以上非友方）时抬到 44；
 *   前方通畅但路不够长时 16；其余普通近战 13。
 * 放完接什么：交回共享交战计划；残雪（短时粒子）与积伤都是它留下的东西。
 */
namespace PokemonSkills {
    /** 施法者真实脚底（身体中心下移半高）。 */
    function avalancheFeet(context: WorldBehavior.Context): CombatPoint {
        const self = CompanionBehavior.source(context);
        const height = self.height === undefined ? 1.4 : self.height;
        return WorldCombat.point(self.point[0], self.point[1] - height / 2, self.point[2]);
    }

    /** 本招当前雪堆半宽（复用公式，含体型与积伤层数）。 */
    function avalancheHalf(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        return p(avalancheId, "radius", { world: world, actor: world.source(), skill: skills[avalancheId], detail: { values: capability.data.config } });
    }

    /** 沿自身→目标路线，雪体最多还能贴地推进多远（0 表示第一步就撞墙/遇崖）。 */
    function avalancheCleared(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const feet = avalancheFeet(context);
        const goal = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(goal.minus(feet), WorldCombat.point(0, 0, 1));
        const reach = Math.max(2.0, capability.data.range);
        let y = feet.y(), cleared = 0;
        for (let d = 0.8; d <= reach + 0.4; d += 0.8) {
            const ahead = avalancheGround(world, feet.x() + heading.x() * d, y, feet.z() + heading.z() * d);
            if (ahead === null) break;
            const rise = ahead.y() - y;
            if (rise > 0.6 || rise < -avalancheCliff) break;
            y = ahead.y();
            cleared = d;
        }
        return cleared;
    }

    /** 当前这条雪带里还站着几个敌人：被围住时这一记整片扫出去最值。 */
    function avalancheCrowded(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const feet = avalancheFeet(context);
        const goal = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(goal.minus(feet), WorldCombat.point(0, 0, 1));
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = avalancheHalf(context, capability);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let foes = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0) continue;
            const otherPoint = CompanionBehavior.point(other.point);
            const delta = WorldCombat.point(otherPoint.x() - feet.x(), 0, otherPoint.z() - feet.z());
            const along = WorldGeometry.dot(delta, heading), lateral = Math.abs(WorldGeometry.dot(delta, side));
            if (along >= -0.5 && along <= capability.data.range + 0.5 && lateral <= half + 0.5) foes += 1;
        }
        return foes;
    }

    CompanionBehavior.registerUse(avalancheId, {
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
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const cleared = avalancheCleared(context, capability, target);
            // 积伤优先也先看路径：路够长才把翻倍这一记顶到最前。
            if (CompanionBehavior.ai<boolean>(capability, "crumble", true)
                && CompanionBehavior.status(context, self, avalancheStatus)) return cleared >= 1.2 ? 53 : 22;
            if (cleared < 1.2) return 6;
            if (avalancheCrowded(context, capability, target) >= 2) return 44;
            return cleared >= distance - 0.6 ? 34 : 16;
        }
    });

    addPreferences(avalancheId, {}, [
        field(pathOf("deepdrift"), "厚重", "boolean", {
            help: "开启：雪堆半宽 ×1.25、击退 ×1.15、滑得更远 ×1.12，铺开压制；但本击 ×0.90、起手多 2 刻、冷却多 8 刻。关闭：本击 ×1.06，滑得干脆。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "目标离自己这么远以内才考虑塌滑；调大愿意主动逼近更远的目标。"
        }),
        field(pathOf("ai.crumble"), "趁积伤崩", "boolean", {
            help: "开启后，自己带着「被打懵」积伤且前方路径够长时优先崩出去（正是翻倍窗口）；关闭则只在被围住且前方通畅时才优先。"
        })
    ]);
}
