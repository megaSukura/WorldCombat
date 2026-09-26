/**
 * 断尾 / shedtail 的 AI 用途。
 *
 * 什么局面下出手：附近有威胁、自己还没有断过尾、并且付得起那一半生命（默认要求生命高于 65%）时，
 * 原地断尾，把尾巴留下并把追兵引过去，自己沿选定方向撤开。
 * 出手前用行为帧的只读世界（`CompanionBehavior.world`）沿**本招实际会走的撤离方向与距离预算**做一次原生
 * free-space 探测；没有一条连得起来的退路就不出手，而不是拿威胁距离近似。
 * `ai.release` 决定撤向哪：默认撤向主人身边（没有主人时背离威胁），也可以改成背离威胁。
 * `ai.reserveHealth` 是付完之后要留下的比例；越高越不肯把自己削到危险区。
 */
namespace PokemonSkills {
    /**
     * The retreat destination both `available` and `target` use, so the safety probe and the cast judge one path.
     * Mirrors the release preference: the owner's point when available, otherwise directly away from the threat.
     */
    function shedtailReleasePoint(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number[] {
        var self = CompanionBehavior.source(context), threat: WorldMethods.Subject | null = context.senses["world_combat:threat"];
        var owner = context.facts.owner, distance = Number(capability.data.range) || 0;
        if (CompanionBehavior.ai<string>(capability, "release", "owner") === "owner" && owner)
            return owner.point.slice();
        if (threat) {
            var dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
            var length = Math.sqrt(dx * dx + dz * dz) || 1;
            return [self.point[0] + dx / length * distance, self.point[1], self.point[2] + dz / length * distance];
        }
        return [self.point[0], self.point[1], self.point[2] + distance];
    }

    CompanionBehavior.registerUse("shedtail", {
        protocols: ["world_combat:cover"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            var threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            var self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "shed_tail")) return false;
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.15);
            if (CompanionBehavior.ratio(self) <= 0.5 + reserve) return false;
            // Probe the same retreat the cast will take, with the native free-space check the movement reuses.
            var world = CompanionBehavior.world(context);
            var actor = world.actor(self.ref), body = actor === null ? null : world.observe(actor);
            if (body === null) return false;
            var destination = shedtailReleasePoint(context, capability);
            var dx = destination[0] - self.point[0], dz = destination[2] - self.point[2];
            var planar = Math.sqrt(dx * dx + dz * dz);
            var heading = planar < 0.01 ? WorldCombat.point(0, 0, 1) : WorldCombat.point(dx / planar, 0, dz / planar);
            var range = Number(capability.data.range) || 0, aimed = CompanionBehavior.distance(self.point, destination);
            var budget = Math.max(0, Math.min(range, aimed > 0.01 ? aimed : range));
            if (!(budget > 0)) return false;
            var feet = WorldCombat.point(self.point[0], self.point[1] - body.height() / 2, self.point[2]);
            return shedtailClearReach(world, feet, heading, budget, body.width(), body.height()) >= 1;
        },
        accepts: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0);
        },
        approachTarget: function (context, capability, target) { return CompanionBehavior.source(context); },
        target: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            var copy: any = JSON.parse(JSON.stringify(self));
            copy.point = shedtailReleasePoint(context, capability);
            return copy;
        },
        priority: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            // 生命被压到危险区时优先脱身。
            return CompanionBehavior.ratio(self) < 0.55 ? 70 : 0;
        }
    });

    addPreferences("shedtail", {}, [
        field(pathOf("ai.reserveHealth"), "付完保留的生命", "number", {
            min: 0.05, max: 0.5, step: 0.05,
            help: "支付一半生命后至少要留下的比例；越高越谨慎，可能干脆不断尾。"
        }),
        field(pathOf("ai.release"), "撤离方向", "choice", {
            options: [{ value: "away", label: "背离威胁" }, { value: "owner", label: "向主人靠拢" }],
            help: "尾巴留下的方向不变，改变的是自己往哪撤：背离威胁拉开距离，或退回主人身边。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会断尾抽身；关闭则只在原地方便时施放。"
        })
    ]);
}
