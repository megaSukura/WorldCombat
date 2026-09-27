/**
 * 拍击 / pound 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 3）之内——这是一记贴身扇扫。
 * 它是全族最便宜、回得最快的一招，所以 AI 把它当作近身缠斗的底牌：没有别的招能用时它也总是可用。
 * 对谁出手：`ai.swarm`（默认开）时，目标朝向前方的 `reach` 扇面里同时站着两个以上敌人就明显抬分——一次拍到几个
 *   正是它的用法；只数真正在身前扇面里的，不把背后绕身的敌人算进来。焦点的目标另加一档。
 * 够不到怎么办：交给共享接近逻辑走到射程内。
 */
namespace PokemonSkills {
    function poundValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标方向前方、本拍实际张角扇面内的可见敌人数（含目标自己），不数背后 360° 附近的人。 */
    function poundCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.2) return 1;
        const ux = dx / length, uz = dz / length;
        let arc = 96;
        try {
            const world = CompanionBehavior.world(context);
            arc = p("pound", "arc", { world: world, actor: world.source(), detail: { values: capability.data.config } });
        } catch (error) { }
        const half = Math.max(35, Math.min(86, arc / 2)) * Math.PI / 180;
        const cosine = Math.cos(half), spacing = capability.data.range + 0.4;
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let crowd = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > spacing) continue;
            if (distance >= 0.2 && (ox * ux + oz * uz) / distance < cosine) continue;
            crowd++;
        }
        return crowd;
    }

    CompanionBehavior.registerUse("pound", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!poundValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 3);
        },
        accepts: function (context, capability, target) { return poundValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const source = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(source.point, target.point) > capability.data.range) return 0;
            let score = 18;
            if (CompanionBehavior.ai<boolean>(capability, "swarm", true)) {
                if (poundCrowd(context, capability, target) >= 2) score += 22;
            }
            if (context.facts.focus === target.ref) score += 12;
            return score;
        }
    });

    addPreferences("pound", {}, [
        field(pathOf("heavy"), "重拍式", "boolean", {
            help: "开启：拍得更重、扇面更宽、能把目标拍开一步，但多出起手与更长的冷却；关闭（快拍式）：瞬发、冷却最短、随时能拍，但单发最低、只推得动一小步。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 8, step: 1,
            help: "超过这个距离就不主动拍，先走近。这一招只够到身前，调大只在追击时更容易落空。"
        }),
        field(pathOf("ai.swarm"), "优先拍成群的敌人", "boolean", {
            help: "开启：扇面里同时站着两个以上敌人时明显优先出这一拍；关闭：只按普通近身候选排序。"
        })
    ]);
}
