/**
 * 出奇一击 / feintattack 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标，且目标**真实背侧**有一块能站下、又在本次 `reach` 突进预算内、还能沿落点拳线够到目标的空位时才列入候选；
 * 够不到交给共享接近逻辑。
 * `ai.backline`（默认开）：目标此刻的朝向背离自己（把后背对着自己的方向）时抬高 priority——绕背打的就是没防备的那一侧。
 * `ai.caution`（默认开）：自身生命低于约三成时不冒险绕背，先把机会留给别的招式。
 * 配置 decoy（佯攻／潜袭）在「花时间留替身牵制」与「更快更省地直接绕背」之间取舍。
 */
namespace CompanionBehavior {
    /** 目标此刻是否把后背朝向自己（真实朝向，而不是它向外走的速度）。 */
    function feintTurnedAway(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "feintattack:back:" + target.ref, function () {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const body = access.actor(target.ref);
            if (body === null) return false;
            const look = WorldGeometry.facing(access, body);
            if (look === null) return false;
            const flatLook = WorldCombat.point(look.x(), 0, look.z());
            const toSelf = WorldCombat.point(self.point[0] - target.point[0], 0, self.point[2] - target.point[2]);
            if (flatLook.length() < 0.05 || toSelf.length() < 0.05) return false;
            return WorldGeometry.dot(toSelf.unit(), flatLook.unit()) < -0.3;
        });
    }

    /** 目标真实背侧/侧后是否有一块能站下、又在本次突进预算内、且落点拳线够得到的落脚点；同一决策帧内缓存。 */
    function feintBackRoom(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "feintattack:room:" + target.ref, function () {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const actor = access.actor(target.ref);
            if (actor === null) return false;
            const width = self.width === undefined ? 0.9 : self.width, height = self.height === undefined ? 1.4 : self.height;
            // 与 skill 的 behind 公式同源：按施术者体型抬高落点距离。
            const behind = Math.max(0.7, Math.min(1.4, 0.85 + (height - 1.4) * 0.15));
            const toTarget = WorldCombat.point(target.point[0] - self.point[0], 0, target.point[2] - self.point[2]);
            if (toTarget.length() < 0.01) return false;
            const feet = WorldCombat.point(self.point[0], self.point[1] - height / 2, self.point[2]);
            const budget = capability.data.range;
            const candidates = PokemonSkills.feintApproachSpots(access, actor, toTarget.unit(), behind);
            for (let i = 0; i < candidates.length; i++) {
                const spot = LivingActions.freeSpot(access, candidates[i], width, height, 1.5);
                if (spot === null || spot.minus(feet).length() > budget + 1e-6) continue;
                const nearest = access.closestPoint(actor, spot);
                if (nearest.minus(spot).length() > behind + 0.6) continue;
                const clip = access.clipBlocks(spot, nearest);
                if (clip !== null && !clip.blocked()) return true;
            }
            return false;
        });
    }

    registerUse("feintattack", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "caution", true)
                && CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.35) return false;
            return feintBackRoom(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            let base = gap <= capability.data.range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "backline", true) && feintTurnedAway(context, target)) base += 12;
            return base;
        }
    });

    PokemonSkills.addPreferences("feintattack", { decoy: false, ai: { maxChase: 9, backline: true, caution: true } }, [
        PokemonSkills.field(PokemonSkills.pathOf("decoy"), "佯攻", "boolean", {
            help: "开启（佯攻）：在对手正面留一个暗影替身短暂引开它的注意力，自己从背后打；起手多 4 刻、冷却多 8 刻。关闭（潜袭）：不设替身，直接绕背，更快更省。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 18, step: 1,
            help: "目标在这个距离内才考虑绕背；调大愿意追更远的目标。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.backline"), "追背对的目标", "boolean", {
            help: "开启后，真正把后背朝向自己的敌人优先成为绕背目标；关闭则只按普通近战排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.caution"), "低血谨慎", "boolean", {
            help: "开启（谨慎）：自身生命低于约三成时不绕背，避免送上门；关闭（搏命）：哪怕残血也照常找空位绕背。"
        })
    ]);
}
