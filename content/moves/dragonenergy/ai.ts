/**
 * 巨龙威能 / dragonenergy 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一道前向的 3D 龙息锥，威力随自己血量走，越满越盛，也能沿一条线贯穿。`available` 要求
 * 有可见、敌对、存活且在 `ai.maxChase`（默认 12）格内的目标；献祭式（根配置 `sacrifice`）会真的抽走生命，
 * 所以按当前 `lifeDraw` 算：扣血后仍低于 `ai.sacrificeAbove` 就放弃，避免不知情地把自己抽空。
 * `priority` 在自己血量越满、以及（开了 `ai.line` 时）目标方向**有限锥内**还排着更多可达敌人时抬高——
 * 只数 `coneLength` 以内、张角覆盖到的敌人，不再把无限延长线上的敌人也算作收益。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function dragonenergyWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 目标方向、实际锥长与张角内还排着几个可达的非友方（含目标）。 */
    function dragonenergyLine(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const length = Math.max(6, p("dragonenergy", "coneLength", world));
        const angle = Math.max(24, Math.min(64, p("dragonenergy", "coneAngle", world)));
        const tanHalf = Math.tan(angle * Math.PI / 360);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 0.05) return 1;
        const ux = dx / span, uz = dz / span;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz, side = Math.abs(ox * uz - oz * ux);
            if (along <= 0 || along > length) continue;
            if (side <= Math.max(0.6, along * tanHalf)) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("dragonenergy", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const config = capability.data.config;
            if (config && config.sacrifice === true) {
                // 根配置开了献祭式：按实际 lifeDraw 扣预算，扣完仍低于血线就不喷。
                const world = CompanionBehavior.world(context);
                const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
                const draw = p("dragonenergy", "lifeDraw", world);
                if (ratio - draw < CompanionBehavior.ai<number>(capability, "sacrificeAbove", 0.35)) return false;
            }
            if (!target) return true;
            return dragonenergyWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !dragonenergyWants(context, capability, target)) return 0;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            let score = 20 + Math.round(ratio * 16);
            if (CompanionBehavior.ai<boolean>(capability, "line", true) && dragonenergyLine(context, capability, target) >= 2) score += 16;
            if (capability.data.config && capability.data.config.sacrifice === true) score += 10;
            return score;
        }
    });

    addPreferences("dragonenergy", {}, [
        field(pathOf("sacrifice"), "献祭式", "boolean", {
            help: "开启：龙息 ×1.3，但施放瞬间抽走最大生命的一部分（血量越低抽得越多），血薄时会把后面几发一起打薄甚至自毙；关闭（守成式）＝不出血、威力较低。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动喷龙息，先朝目标走近。越大越愿意在远处先手，锥也越容易只罩住一个。"
        }),
        field(pathOf("ai.line"), "成列时优先", "boolean", {
            help: "开启后，目标方向的实际锥长与张角内还排着别的可达敌人时优先喷龙息，一发贯穿一列；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.sacrificeAbove"), "献祭血线", "number", {
            min: 0.1, max: 0.9, step: 0.05, display: { scale: 100, suffix: "%" },
            help: "开启献祭式后，按实际抽血量扣完仍低于这个比例时不再喷龙息，免得抽血把自己抽空。越高越保守。"
        })
    ]);
}
