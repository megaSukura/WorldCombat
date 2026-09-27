/**
 * 滚动 / rollout 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 6）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁；命中后把人顶开，伙伴会重新贴上再滚下一趟。带着层数时若原本的目标够不到，
 * 共享调度会让它改评另一个在射程内、实际可达的敌人。
 * 为什么优先接着滚：`ai.pressOn`（默认开）下，身上带着连滚身份时优先级抬高——层数断掉就从最轻的一趟重来。
 * 路线：用滚动体积从真实脚底沿「自己→目标」方向探一段是否开阔，并检查地面断崖；开阔可接续的路线加分，
 * 密墙或临崖处降权，重滚式（惯性大、更难接住）降得更多，不贪一次必断的连滚。
 * 放完之后：只要还在连滚窗口里，伙伴会倾向继续滚动；被打断或被拉开距离就交回共享顺序重新判断。
 */
namespace PokemonSkills {
    /** 采样点脚下 `drop` 格内是否有真实支撑；纯空气/液体的悬空点算断崖。 */
    function rolloutSupport(world: CombatWorld, point: CombatPoint, drop: number): boolean {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), y = Math.floor(point.y());
        for (let dy = 0; dy <= drop; dy++) {
            const block = world.block(WorldCombat.point(x + 0.5, y - dy, z + 0.5));
            if (block === null) return false;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
                || id === "minecraft:water" || id === "minecraft:lava") continue;
            return true;
        }
        return false;
    }

    /** 沿自己到目标的方向，用真实脚底与滚动体积探一段开阔度，并检查地面断崖；被墙夹住或临崖时降权。按决策帧缓存一次。 */
    function rolloutOpenRoute(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_rollout/route/" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            if (!LivingActions.hasFreeSpace(world)) return true;
            const self = CompanionBehavior.source(context);
            const actor = world.actor(self.ref);
            const body = actor === null ? null : world.observe(actor);
            if (body === null) return true;
            const centre = body.position(), feetY = body.boundsMin().y();
            const width = Math.max(0.4, body.width()), height = Math.max(0.6, body.height());
            const dx = target.point[0] - centre.x(), dz = target.point[2] - centre.z();
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.5) return true;
            const spacing = 0.7, samples = Math.max(1, Math.ceil(Math.min(length, 4) / spacing));
            for (let i = 1; i <= samples; i++) {
                const probe = WorldCombat.point(centre.x() + dx / length * spacing * i, feetY, centre.z() + dz / length * spacing * i);
                if (!LivingActions.freeSpace(world, probe, width, height)) return false;
                if (!rolloutSupport(world, probe, 2)) return false;
            }
            return true;
        });
    }

    CompanionBehavior.registerUse(rolloutId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const pressing = CompanionBehavior.ai<boolean>(capability, "pressOn", true)
                && CompanionBehavior.status(context, self, rolloutStreak);
            const heavy = !!(capability.data.config && capability.data.config.heavy);
            const open = rolloutOpenRoute(context, target);
            let score = pressing ? 32 : 21;
            if (open) score += pressing ? 6 : 3;
            else score -= heavy ? 16 : 4;
            return Math.max(4, score);
        }
    });

    addPreferences(rolloutId, {}, [
        flag("heavy", "重滚式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.pressOn", "接住滚动")
    ]);
}
