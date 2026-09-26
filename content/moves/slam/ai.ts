/**
 * 摔打 / slam 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 5）之内。它是一记慢而重的窄长落痕，
 * 落痕留在扬起时与施法者连成的方向线上，所以 AI 有两条选靶倾向：
 *   `ai.preferStill`（默认开）：不动、被定住、睡眠或冰冻的目标排得更前，正在奔跑的目标降分（大概率砸空）。
 *   `ai.preferLine`（默认开）：目标与施法者连成的窄道上还排着别的敌人时抬分——一记落痕砸穿一整排正合适。
 * 对谁出手：血太少的目标适当降分——用一记最重的招收残是浪费，留给更便宜的招；焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑走到射程内。
 */
namespace PokemonSkills {
    function slamValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    function slamStill(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (target.rooted || target.sleeping) return true;
        const motion = CompanionBehavior.velocity(context, target);
        if (motion === null) return true;
        return Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]) < 0.05;
    }

    /** 施法者到目标的窄道（宽约 0.9 格）里还排着几个别的敌人——落痕正适合砸这种一字排开。 */
    function slamLinedUp(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.2) return 0;
        const hx = dx / length, hz = dz / length;
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * hx + oz * hz;
            const side = Math.abs(ox * hz - oz * hx);
            if (along > 0.3 && along <= capability.data.range + 0.5 && side <= 0.9) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("slam", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!slamValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) { return slamValid(target); },
        priority: function (context, capability, target) {
            if (!target || !slamValid(target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferStill", true)) {
                if (slamStill(context, target)) score += 18;
                else score -= 8;
            }
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true)) {
                const lined = slamLinedUp(context, capability, target);
                if (lined >= 1) score += 16;
                if (lined >= 2) score += 10;
            }
            if (CompanionBehavior.status(context, target, "sleep") || CompanionBehavior.status(context, target, "frozen")) score += 12;
            if (CompanionBehavior.ratio(target) < 0.2) score -= 12;
            if (context.facts.focus === target.ref) score += 14;
            return Math.max(0, score);
        }
    });

    addPreferences("slam", {}, [
        field(pathOf("heavy"), "沉砸式", "boolean", {
            help: "开启：砸得更重、落痕更宽、震得更远，但落下更慢、更容易被躲开，收招与冷却也更久；关闭（疾砸式）：落得快、出手快，更容易砸中移动中的目标，但单发略低、落痕更窄。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动抡起，先走近。这一招慢，调大只在追击时更容易砸空。"
        }),
        field(pathOf("ai.preferStill"), "只砸站得住的目标", "boolean", {
            help: "开启：不动、被定住、睡眠或冰冻的目标优先，正在奔跑的目标降分；关闭：只按威胁与距离排序，愿意赌一发预判。"
        }),
        field(pathOf("ai.preferLine"), "优先砸成一线的敌人", "boolean", {
            help: "开启：目标与施法者连成的窄道里还排着别的敌人时明显优先砸这一记；关闭：只按单点收益排序，不看有没有排成一条线。"
        })
    ]);
}
