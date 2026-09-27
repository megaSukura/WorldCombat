/**
 * 钢翼 / steelwing 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 7）格内；更远交给共享接近逻辑。
 * 对谁出手/站哪：`accepts` 只筛阵营、存活与可见；这是两侧翼缘的横扫，站位比目标身份更重要。`ai.preferCrowd`
 *   （默认开）按**两侧可达者**抬价（`steelwingCrowd` 数落在翼扫角度带里的敌人），两条翼缘能分别扫到两侧的人。
 *   施放时 `execute` 不直瞄单敌，而按双翼几何把瞄准点偏转到翼扫的那一侧，让锁定的目标落在一条翼缘上、
 *   不再站在正前方安全缝里。
 *   `glide` 开启时用只读世界入口 `CompanionBehavior.world(context)` 的 `freeSpace` 探一下前方通道，
 *   前方被挡就压低滑翔优先级——滑翔需要一段真实推进的空间，不是往墙上撞。
 * 为什么先出手：`ai.braceUp`（默认开）在自己防御还没到 +4 级时抬价，先把翼面磨硬再去吃伤害。
 * 放完之后：防御等级留在身上，交回共享交战计划继续交战。
 */
namespace PokemonSkills {
    /** 本个体当前翼扫角度（speed 派生，滑翔式再放开）；只读。 */
    function steelwingSpan(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context), config = item.data.config || {};
        return world
            ? Math.max(85, Math.min(150, p("steelwing", "span", { world: world, actor: world.source(), detail: { values: config }, skill: skills["steelwing"] })))
            : 105;
    }

    /** 两侧可达者：落在翼扫角度带（20°..span）内、射程内、当前视线可达的敌人有几个；只是排序读法。 */
    function steelwingCrowd(context: WorldBehavior.Context, self: CompanionBehavior.Entity, reach: number, target: CompanionBehavior.Entity, span: number): number {
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        const world = CompanionBehavior.world(context);
        const ax = target.point[0] - self.point[0], az = target.point[2] - self.point[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 1;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let index = 0; index < nearby.length && count < 6; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible || String(other.ref) === String(self.ref)) continue;
            const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > reach || distance < 0.5) continue;
            const along = dx * ux + dz * uz, lateral = Math.abs(dx * uz - dz * ux);
            const bearing = Math.atan2(lateral, along) * 180 / Math.PI;
            if (bearing < 20 || bearing > span) continue;
            if (!world || world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    /** 偏转后的瞄准点：把锁定目标摆到一条翼缘的扫过角上，另一侧留给别的敌人；目标正前不再直瞄安全缝。 */
    function steelwingAimPoint(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): number[] {
        const self = CompanionBehavior.source(context);
        const span = steelwingSpan(context, item);
        const reach = Number(item.data.range) || 3.2;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-4) return [self.point[0], target.point[1], self.point[2]];
        const config = item.data.config || {};
        // 滑翔式整段保持全幅（翼在 span 角），原地式从 20° 扫到 span；取各自该把目标摆上去的角。
        const wingAngle = config.glide === true ? span : (20 + span) / 2;
        const offset = Math.max(20, Math.min(110, wingAngle)) * Math.PI / 180;
        const ux = dx / length, uz = dz / length;
        // 数目标两侧各挤着几个可切入的敌人，往人多的对侧偏，让另一条翼缘也有收获。
        const nearby: CompanionBehavior.Entity[] = <any>context.facts.nearby || [];
        let left = 0, right = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible || String(other.ref) === String(self.ref)) continue;
            const side = (other.point[0] - self.point[0]) * uz - (other.point[2] - self.point[2]) * ux;
            if (side >= 0) right++; else left++;
        }
        const sign = right >= left ? 1 : -1, cos = Math.cos(offset * sign), sin = Math.sin(offset * sign);
        const rx = ux * cos - uz * sin, rz = ux * sin + uz * cos;
        const aimLength = Math.max(1.5, Math.min(reach * 0.95, length));
        return [self.point[0] + rx * aimLength, target.point[1], self.point[2] + rz * aimLength];
    }

    /** 滑翔式需要一个大致畅通的前方：用只读世界的 freeSpace 探一段，被挡就别硬滑。 */
    function steelwingChannel(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return true;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-4) return true;
        const test = Math.min(1.2, length - 0.3);
        if (test <= 0) return true;
        const ahead = CompanionBehavior.point([self.point[0] + dx / length * test, self.point[1], self.point[2] + dz / length * test]);
        return world.freeSpace(ahead, typeof self.width === "number" ? self.width : 0.9,
            typeof self.height === "number" ? self.height : 1.4);
    }

    CompanionBehavior.registerUse("steelwing", {
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
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)
                && steelwingCrowd(context, self, capability.data.range, target, steelwingSpan(context, capability)) >= 2) score += 14;
            if (capability.data.config && capability.data.config.glide === true && !steelwingChannel(context, self, target)) score -= 12;
            if (CompanionBehavior.ai<boolean>(capability, "braceUp", true)) {
                const stage = CompanionBehavior.stage(context, self, "def");
                if ((typeof stage === "number" ? stage : 0) < 4) score += 8;
            }
            return score;
        },
        // 不直瞄单敌：按双翼几何把瞄准点偏到一条翼缘扫过的角上，让锁定的目标落在翼侧而不是正前安全缝。
        execute: function (context, capability, target) {
            const point = steelwingAimPoint(context, capability, target);
            const subject: WorldMethods.Subject = { ref: "", point: point, visible: false, hurtAgo: 1000000 };
            return (context.services.behavior as WorldMethods.Host).use(capability, subject);
        }
    });

    addPreferences("steelwing", {}, [
        field(pathOf("glide"), "滑翔扫", "boolean", {
            help: "开启：先向前真实滑出一段、滑行期间保持两侧全幅翼缘，展翼更宽、击退更远、升防更稳，但起手与冷却更久，也可能为扫人而滑进敌阵；关闭（原地扫）：站定展开双翼扫过身侧，更快更便宜、翼展略短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才主动展翼；调大愿意主动凑上去扫两侧。"
        }),
        field(pathOf("ai.preferCrowd"), "优先扫两侧", "boolean", {
            help: "开启：目标身边还挤着别人时优先展翼，两条翼缘分别扫到两侧的人；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.braceUp"), "先磨防御", "boolean", {
            help: "开启：自己防御还没到 +4 级时抬价，先把翼面磨硬再去吃伤害；关闭则不特意为增益出手。"
        })
    ]);
}
