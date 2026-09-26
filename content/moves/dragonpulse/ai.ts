/**
 * 龙之波动 / dragonpulse 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一道沿直线前进的波，所以 `ai.preferLine`（默认开）在「自己 → 目标」这条线的后方还有别的敌人时把它排到前面——
 * 代价是可能为了找一条好线而偏离最好的站位；关闭则只当一记普通远程法术用，不再为成排目标绕线。
 * 连锁式与贯通式不改变出手条件，只改变波的作用形状，由配置承担。
 */
namespace PokemonSkills {
    /** 另一个敌人是否落在「自己 → 目标」方向、半径约 `spread` 的窄带内，且不比自己更靠近。 */
    function dragonpulseOnLine(self: WorldMethods.Subject, target: WorldMethods.Subject, other: WorldMethods.Subject, reach: number): boolean {
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
        const od = Math.sqrt(ox * ox + oz * oz);
        if (od < 0.4 || od > reach) return false;
        const along = (ox * dx + oz * dz) / length;
        if (along <= length + 0.3) return false;
        const off = Math.abs((ox * dz - oz * dx) / length);
        return off <= Math.max(0.7, od * 0.09);
    }

    CompanionBehavior.registerUse("dragonpulse", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const reach = capability.data.range;
            if (CompanionBehavior.distance(self.point, target.point) > reach) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true)) {
                let lined = 0;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (dragonpulseOnLine(self, target, other, reach)) lined++;
                }
                if (lined >= 1) score += 8 + Math.min(16, lined * 6);
            }
            return score;
        }
    });

    addPreferences("dragonpulse", {}, [
        field(pathOf("chain"), "连锁式", "boolean", {
            help: "开启：波在碰到第一个敌人时收束，再沿同一条线依次命中后续目标、每级威力递减（不再前进）；关闭：贯通式，波沿直线以完整威力继续穿过后面的敌人。连锁式吃一条衰减的链，贯通式吃一列硬伤。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手推波。"
        }),
        field(pathOf("ai.preferLine"), "成列时优先", "boolean", {
            help: "开启：目标后方还排着别的敌人、能被同一列波扫到时优先出手（可能为找线偏离站位）；关闭：只当普通远程法术用。"
        })
    ]);
}
