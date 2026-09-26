/**
 * 灭亡之歌 的伙伴 AI 用途：这招自己的一套出手计划——只在自己比对手更能撑、而且真的撤得掉的时候唱。
 *
 * 什么局面有意义：有可见的威胁，自己的生命比例掉到 ai.threshold 以下（说明这一场正在输），
 *   威胁在 ai.maxChase 之内，身上还没被歌声缠上。
 * 退路：检查逃生线外的落脚点和沿途完整身体空间／地面支撑，或读原生合法后备；
 *   且半径内没有被定身、撤不掉的队友，否则不唱——唱了就是把自己和跑不动的队友一起写进名单。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（fortify 位）。
 * 候选之间怎么排：生命更低时抬到 90，抢在普通自增益前先唱；否则 45 交回普通次序。
 * 放完之后：朝那条安全退路走，尽量在数拍期间离开自己的歌区。
 * 配置：ai.threshold 决定多被动才唱；ai.maxChase 决定威胁多近才算数；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    function perishReserve(access: CombatWorld, actor: CombatActor): PokemonSkills.PartyMember | null {
        return PokemonSkills.partyReserve(PokemonSkills.partyRoster(access, actor), PokemonSkills.partyActiveId(access, actor));
    }
    /** Conservative walkable corridor: native body clearance and native block support at overlapping body samples. */
    function perishWalkable(access: CombatWorld, body: CombatObservation, destination: number[]): boolean {
        const feet = PokemonSkills.partyFeet(body), end = point(destination), delta = end.minus(body.position());
        const steps = Math.max(1, Math.ceil(delta.length() / Math.max(.1, body.width() * .5)));
        for (let step = 1; step <= steps; step++) {
            const sample = feet.plus(delta.scale(step / steps));
            if (!access.freeSpace(sample, body.width(), body.height())) return false;
            const floor = access.clipBlocks(sample.plus(WorldCombat.point(0, .2, 0)), sample.plus(WorldCombat.point(0, -.6, 0)));
            if (floor === null || !floor.blocked()) return false;
        }
        return true;
    }
    function perishExit(context: WorldBehavior.Context, origin: number[], escape: number, previous?: number[]): number[] | null {
        const access = world(context), actor = access.source(), body = access.observe(actor);
        if (body === null) return null;
        const threat = context.senses["world_combat:threat"] as Entity | null;
        let x = previous ? previous[0] - origin[0] : threat ? body.position().x() - threat.point[0] : 1;
        let z = previous ? previous[2] - origin[2] : threat ? body.position().z() - threat.point[2] : 0;
        const length = Math.sqrt(x * x + z * z); if (length < .01) { x = 1; z = 0; } else { x /= length; z /= length; }
        const distance = escape + body.width() * .5 + 1.5;
        for (const angle of [0, Math.PI / 4, -Math.PI / 4]) {
            const dx = x * Math.cos(angle) - z * Math.sin(angle), dz = x * Math.sin(angle) + z * Math.cos(angle);
            const candidate = [origin[0] + dx * distance, body.position().y(), origin[2] + dz * distance];
            if (perishWalkable(access, body, candidate)) return candidate;
        }
        return null;
    }
    function perishRetreat(context: WorldBehavior.Context, self: Entity): boolean {
        return observedFlag(context, "world_combat:move_perishsong/retreat:" + self.ref, function () {
            const access = world(context), actor = access.actor(self.ref); if (actor === null) return false;
            const radius = Math.max(2.5, PokemonSkills.p(PokemonSkills.perishId, "songRadius", access));
            for (const ally of (context.facts.nearby || []) as Entity[]) {
                if (ally.ref !== self.ref && ally.friendly && ally.health > 0 && distance(ally.point, self.point) <= radius && bound(context, ally)) return false;
            }
            return perishReserve(access, actor) !== null || perishExit(context, self.point, radius * 2) !== null;
        });
    }

    /** Keep this cast's original centre/countdown; switch legally or remain outside until its existing one-beat escape completes. */
    function perishFallBack(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        const access = world(context), actor = access.source(), body = access.observe(actor);
        if (body === null) return WorldBehavior.failure("actor-left");
        const carrier = MobEffects.read(access, actor, PokemonSkills.perishEffect);
        if (carrier === null) { stopMovement(context); return WorldBehavior.success(); }
        const counts = access.effects(actor, PokemonSkills.perishCount);
        if (!counts.length) return WorldBehavior.failure("song-origin-unavailable");
        const mark = JSON.parse(counts[0].data());
        if (!progress.switchTried) {
            const reserve = perishReserve(access, actor); progress.switchTried = true;
            if (reserve && PokemonSkills.partySwitchOut(access, actor, reserve.slot, PokemonSkills.partyFeet(body)).ok) return WorldBehavior.success();
        }
        if (body.position().minus(point(mark.origin)).length() > mark.escapeRadius) {
            stopMovement(context); return WorldBehavior.running();
        }
        let destination = progress.perishExit as number[] | undefined;
        if (!destination || point(destination).minus(point(mark.origin)).length() <= mark.escapeRadius + .5 || !perishWalkable(access, body, destination))
            destination = perishExit(context, mark.origin, mark.escapeRadius, destination) || undefined;
        if (!destination) return WorldBehavior.failure("no-retreat");
        progress.perishExit = destination;
        const navigation = navigate(context, destination, .5);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : WorldBehavior.failure(navigation);
    }

    registerUse("perishsong", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "stay" || context.facts.intent === "hold") && !ai<boolean>(capability, "leaveStation", false)) return false;
            const self = source(context);
            // The existing use still owns its escape follow-up while marked; this does not offer another cast.
            if (marker(context, self, PokemonSkills.perishEffect)) return continuing(context, capability.id);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.55)) return false;
            if (distance(self.point, threat.point) > ai<number>(capability, "maxChase", 12)) return false;
            return perishRetreat(context, self);
        },
        priority: function (context, capability, _target) {
            const self = source(context);
            return ratio(self) < 0.35 ? 90 : 45;
        },
        execute: function (context, capability, target, progress) {
            const access = world(context), self = source(context);
            progress.perishExit = perishExit(context, self.point, PokemonSkills.p(PokemonSkills.perishId, "songRadius", access) * 2);
            return (context.services.behavior as WorldMethods.Host).use(capability, target);
        },
        after: function (context, _capability, _target, progress) {
            progress.fallingBack = 1;
            return perishFallBack(context, progress);
        }
    });

    PokemonSkills.addPreferences("perishsong", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "起唱歌量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "生命比例低于这个值才起唱；调大更早把整场拉平，调小只在真的撑不住时唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 3, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑起唱；调小只在贴身时唱，调大愿意对着更远的对手唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去起唱。"
        })
    ]);
}
