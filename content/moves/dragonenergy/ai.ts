/**
 * 巨龙威能 / dragonenergy 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一道前向的龙息锥，威力随自己血量走，越满越盛，也能沿一条线贯穿。`available` 要求
 * 有可见、敌对、存活且在 `ai.maxChase`（默认 12）格内的目标；开了献祭式时，自己血量低于 `ai.sacrificeAbove`
 * 就放弃——抽血会连着后面几发一起打薄，甚至把自己抽空。`priority` 在自己血量越满、以及（开了 `ai.line` 时）
 * 目标方向还排着更多敌人时抬高。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function dragonenergyWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    function dragonenergyLine(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.05) return 1;
        const ux = dx / length, uz = dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz, side = Math.abs(ox * uz - oz * ux);
            if (along >= 0 && side <= 1.6) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("dragonenergy", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            if (CompanionBehavior.ai<boolean>(capability, "sacrifice", false)
                && ratio < CompanionBehavior.ai<number>(capability, "sacrificeAbove", 0.35)) return false;
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
            if (CompanionBehavior.ai<boolean>(capability, "line", true) && dragonenergyLine(context, target) >= 2) score += 16;
            if (CompanionBehavior.ai<boolean>(capability, "sacrifice", false)) score += 10;
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
            help: "开启后，目标方向还排着别的敌人时优先喷龙息，一发贯穿一列；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.sacrificeAbove"), "献祭血线", "number", {
            min: 0.1, max: 0.9, step: 0.05, display: { scale: 100, suffix: "%" },
            help: "开启献祭式后，自己血量低于这个比例时不再喷龙息，免得抽血把自己抽空。越高越保守。"
        })
    ]);
}
