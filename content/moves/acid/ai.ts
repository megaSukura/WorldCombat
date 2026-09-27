/**
 * 溶解液 / acid —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 12）格内；它是短射程的低弧泼溅，先收身位再泼。
 *   手动施放时本招是 aim，可以不对任何实体、只朝空点铺池；AI 仍只从敌人里挑用途，两者分开。
 * 对谁出手：`ai.crowd`（默认开）打开时，目标脚下是可达地面、且没有被已有的酸池盖住、附近真实泼溅半径内还挤着
 *   别的敌人，就抬高 priority——泼溅与酸池能多咬几个；空中目标仍可选，但只算直击、不按池收益加分。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进范围之后再泼。
 * 放完接什么：落点留下腐蚀酸池，交回共享交战计划继续；酸池自己会反复咬留在圈里的人，不需要追着某个目标再泼。
 */
namespace PokemonSkills {
    /** 预测这发酸会落在哪：目标脚下（身体中心减半高）向下找的真实碰撞顶面；没有支撑就没有池。 */
    function acidPredictedLanding(world: CombatWorld, target: CompanionBehavior.Entity): CombatPoint | null {
        const half = (target.height || 1.4) / 2;
        return acidSupport(world, CompanionBehavior.point(target.point).minus(WorldCombat.point(0, half, 0)));
    }

    /** 预测落点周围、真实泼溅半径与高度带内、且从落点可达的敌人数；没有支撑时只有直击（返回 1）。 */
    function acidCrowdCount(context: WorldBehavior.Context, target: WorldMethods.Subject, radius: number): number {
        const world = CompanionBehavior.world(context);
        const landing = acidPredictedLanding(world, target);
        if (landing === null) return 1;
        const band = WorldGeometry.ring(landing, 0, radius, { below: 2, above: 3 });
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            const point = CompanionBehavior.point(other.point);
            if (!band.contains(point)) continue;
            // 从落点真实可达才算被这一发溅到，隔墙的不算。
            if (!world.clear(landing, point)) continue;
            count++;
        }
        return count;
    }

    /** 目标所站地面是否已被本方酸池覆盖：只认本方来源、真实水平半径、贴近池面的高度带与可达。 */
    function acidCovered(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        const world = CompanionBehavior.world(context);
        const point = CompanionBehavior.point(target.point);
        const pools = WorldEffects.areas(world, "world_combat:acid_pool", point, 0);
        for (let i = 0; i < pools.length; i++) {
            const pool = pools[i];
            if (pool.pending) continue;
            const owner = world.actor(pool.source);
            if (owner === null || !world.friendly(owner)) continue;
            const ground = WorldCombat.point(pool.position[0], pool.position[1], pool.position[2]);
            if (!WorldGeometry.ring(ground, 0, pool.radius, { below: 1, above: 2 }).contains(point)) continue;
            if (!world.clear(ground, point)) continue;
            return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("acid", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "crowd", true)) return base;
            // 空中目标没有地面支撑、也就没有酸池收益：仍可直击，但不因扎堆加分。
            if (target.grounded === false) return base;
            if (acidCovered(context, target)) return base;
            let radius = 2.2;
            try {
                const world = CompanionBehavior.world(context);
                radius = Math.max(1.6, p("acid", "poolRadius", { world: world, actor: world.source(), detail: { values: capability.data.config } }));
            } catch (error) { }
            return acidCrowdCount(context, target, radius) >= 2 ? base + 12 : base;
        }
    });

    addPreferences("acid", {}, [
        field(pathOf("corrode"), "腐蚀强化", "boolean", {
            help: "开启：酸池半径 ×1.25、时长 +30 刻、起手 +1 刻、冷却 +6 刻，但单发泼溅 ×0.85，适合封住一片地。关闭：一发更痛的泼溅、酸池较小，适合打疼一群人。"
        }),
        field(pathOf("ai.maxChase"), "泼溅距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动泼酸，先走近；越大越愿意在更远处先手泼。"
        }),
        field(pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启后，目标站在可达地面、还没有被酸池盖住、且身边实际泼溅半径内还有别的敌人时优先泼酸；空中目标仍可选，但不按池收益加分。关闭则只按普通近程攻击排序。"
        })
    ]);
}
