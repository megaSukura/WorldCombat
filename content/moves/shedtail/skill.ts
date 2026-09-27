/**
 * 断尾 / shedtail 的出手方式与工作效果。
 *
 * 念头的形状（两幕 + 持续）：
 *  1) 断——足额支付一半最大生命，在自己原来的位置留下一条真实的尾巴（`WorldBodies` 自持实体，脑
 *     `world_combat:move/shedtail/tail`），自己沿选定的方向抽身离开；撤走前用原生 free-space 与真实支撑
 *     逐点验一条连续可达的段，碰墙或踏空就缩短，逐刻走完并把这段真实路径交给表现；给施法者带上共享身份
 *     `world_combat:status/shed_tail`，只作为「这次已经断过尾」的短标记。
 *  2) 拖住——尾巴每 20 刻对真实持有重定向租约的敌人维持一次 `world.targetLease`：只有原生接受者计入账本，
 *     被外部真实请求接管后不再抢回，离界/换阵营/失去通视就交还自己的租约。只有真实持有租约的敌人才画连线。
 *  3) 结束——尾巴被打碎（break）或时间走完（expire）：交还自己的租约、清掉身份、放出收尾画面。
 *
 * 尾巴属于它自己：施法者被收回、换手退场、区块卸载与重启都不再让它消失；它按自己的耐久挨打，到点或
 * 被打碎才结束。召动者（summoner）保留原生友敌关系；尾巴自身是独立实体。与替身分开：替身承伤，断尾诱敌。
 */
namespace PokemonSkills {
    const shedtailScene = "world_combat:move_shedtail";
    const shedtailTail = "world_combat:move/shedtail/tail";
    const shedtailStatus = "world_combat:shed_tail";
    const shedtailText = "world_combat.move.shedtail.text.shed";
    const shedtailBreakText = "world_combat.move.shedtail.text.break";
    const shedtailExpireText = "world_combat.move.shedtail.text.expire";
    const shedtailSwitchText = "world_combat.move.shedtail.text.switch";
    const shedtailPreviewText = "world_combat.move.shedtail.text.preview";

    /** 一个落脚点确有可站的地面：脚下短距向下探到真实方块。 */
    function shedtailSupported(world: CombatWorld, feet: CombatPoint): boolean {
        return WorldGeometry.blockHit(world, feet.plus(WorldCombat.point(0, 0.05, 0)),
            feet.minus(WorldCombat.point(0, 0.7, 0))) !== null;
    }

    /**
     * How far the caster can actually walk from its feet before the first blocked or unsupported foot-space,
     * capped at `budget`. Uses the native free-space probe plus a real support probe (via WorldGeometry.blockHit),
     * and refuses an unobserved path. The visible trail follows the actual displacement.
     */
    export function shedtailClearReach(world: CombatWorld, feet: CombatPoint, heading: CombatPoint, budget: number,
        width: number, height: number): number {
        if (!(budget > 0) || heading.length() < 0.01) return 0;
        if (!LivingActions.hasFreeSpace(world)) return 0;
        const fine = 0.4, count = Math.ceil(budget / fine);
        let clear = 0;
        for (let index = 1; index <= count; index++) {
            const distance = Math.min(index * fine, budget);
            const sample = feet.plus(heading.scale(distance));
            if (!LivingActions.freeSpace(world, sample, width, height)) break;
            if (!shedtailSupported(world, sample)) break;
            clear = distance;
            if (distance >= budget - 1e-6) break;
        }
        return clear;
    }

    function shedtailRoute(action: CombatAction, world: CombatWorld, body: CombatObservation): {
        feet: CombatPoint; heading: CombatPoint; clear: number;
    } {
        const origin = body.position(), feet = partyFeet(body), offset = action.targetPosition().minus(origin);
        const aimed = WorldCombat.point(offset.x(), 0, offset.z());
        const facing = action.direction(), fallback = WorldCombat.point(facing.x(), 0, facing.z());
        const direction = aimed.length() > 0.01 ? aimed : fallback;
        const heading = direction.length() > 0.01 ? direction.unit() : WorldCombat.point(0, 0, 1);
        const maximum = p("shedtail", "retreat", action);
        const budget = Math.max(0, Math.min(maximum, aimed.length() > 0.01 ? aimed.length() : maximum));
        return { feet: feet, heading: heading, clear: shedtailClearReach(world, feet, heading, budget, body.width(), body.height()) };
    }

    WorldBodies.define(shedtailTail, {
        schema: 1,
        maxTicks: 1200,
        start: function (brain) {
            const world = brain.world(), state = JSON.parse(brain.state());
            const body = world.observe(brain.target());
            if (body === null) return;
            state.point = [body.position().x(), body.position().y(), body.position().z()];
            const caster = state.owner ? world.actor(state.owner) : null;
            const carrier = caster ? MobEffects.apply(world, caster, shedtailStatus, brain.remaining(), 0) : null;
            state.carrier = carrier ? MobEffects.anchor(carrier) : null;
            if (caster && carrier) MobEffects.bind(world, caster, shedtailStatus, carrier);
            brain.state(JSON.stringify(state));
            WorldFeedback.emit(world, shedtailScene, 1, body.position(), { moment: "shed", scale: state.appearance }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), shedtailText, [], 30);
            world.sound("minecraft:entity.sheep.shear", body.position(), 16, "{}");
            brain.schedule("lure", "lure", 20, "{}");
        },
        resume: function (brain) {
            const world = brain.world(), state = JSON.parse(brain.state());
            const caster = state.owner ? world.actor(state.owner) : null;
            if (caster && state.carrier && MobEffects.matches(world, caster, state.carrier))
                MobEffects.bind(world, caster, shedtailStatus);
            brain.schedule("lure", "lure", 20, "{}");
        },
        operations: {
            "world_combat:dispel": function (brain) { brain.end(); },
            "world_combat:shedtail/handoff": function (brain) {
                const state = JSON.parse(brain.state());
                if (String(brain.caller().ref()) !== state.owner || state.handoff) return;
                state.handoff = JSON.parse(brain.input()); brain.state(JSON.stringify(state));
                brain.schedule("handoff", "handoff", 1, "{}");
            }
        },
        handlers: {
            handoff: function (brain) {
                const world = brain.world(), state = JSON.parse(brain.state()), input = state.handoff;
                delete state.handoff; brain.state(JSON.stringify(state));
                const caster = state.owner ? world.actor(state.owner) : null;
                if (!caster || !input || !Array.isArray(input.point) || input.point.length !== 3) return;
                if (!partyRoster(world, caster).some(member => member.id === input.id && member.slot === input.slot
                    && !member.fainted && !member.active && member.state === "inactive")) return;
                const at = WorldCombat.point(input.point[0], input.point[1], input.point[2]);
                const receipt = partySwitchOut(world, caster, input.slot, at);
                if (!receipt.ok) return;
                // The tail remains a valid source after the caster's native recall.
                WorldFeedback.emit(world, shedtailScene, 1, at, { moment: "switch", scale: state.appearance }, 26);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), shedtailSwitchText, [], 26);
            },
            lure: function (brain) {
                const world = brain.world(), state = JSON.parse(brain.state());
                const tail = world.observe(brain.target());
                if (tail === null) { brain.end(); return; }
                const centre = tail.position(), tailActor = brain.target(), tailRef = String(tailActor.ref());
                state.point = [centre.x(), centre.y(), centre.z()];
                const radius = Math.max(1, Number(state.lureRange) || 8);
                const hold = Math.max(20, Math.round(brain.remaining()));
                if (!state.seeded) {
                    // 第一声：对真实可重定向的敌人各申请一次有限租约，原生接受者才计入账本，其余本次不再追写。
                    state.seeded = true; state.accepted = [];
                    const found = world.query(centre, radius, false);
                    for (let index = 0; index < found.length; index++) {
                        const other = found[index];
                        if (String(other.ref()) === tailRef) continue;
                        const facts = world.observe(other);
                        if (facts === null || facts.friendly() || facts.health() <= 0 || facts.player()) continue;
                        if (!world.clear(centre, facts.position())) continue;
                        if (world.targetLease(other, tailActor, hold)) state.accepted.push(String(other.ref()));
                    }
                } else {
                    // 之后只维持仍由本脑持有、且还在范围内有通视的响应者；被外部接管只清账本，不抢回。
                    const kept: string[] = [];
                    for (let index = 0; index < state.accepted.length; index++) {
                        const ref = state.accepted[index], other = world.actor(ref);
                        if (other === null) continue;
                        const facts = world.observe(other);
                        if (facts === null || facts.health() <= 0 || facts.player()) continue;
                        if (world.friendly(other)) { world.targetLeaseRelease(other); continue; }
                        if (facts.position().minus(centre).length() > radius) { world.targetLeaseRelease(other); continue; }
                        const lease = JSON.parse(world.targetLeaseState(other));
                        if (!lease.owned || !lease.active || lease.mode !== "redirect") continue;
                        if (!world.clear(centre, facts.position())) { world.targetLeaseRelease(other); continue; }
                        if (world.targetLease(other, tailActor, hold)) kept.push(ref);
                    }
                    state.accepted = kept;
                }
                brain.state(JSON.stringify(state));
                // 逐敌单独一条尾巴连线：只有真实持有租约的敌人才可见，账本一变旧连线自然到期。
                let lured = 0;
                for (let index = 0; index < state.accepted.length; index++) {
                    const ref = state.accepted[index], other = world.actor(ref);
                    if (other === null) continue;
                    const facts = world.observe(other);
                    if (facts === null || facts.health() <= 0 || facts.position().minus(centre).length() > radius) continue;
                    const lease = JSON.parse(world.targetLeaseState(other));
                    if (!lease.owned || !lease.active || lease.mode !== "redirect" || lease.target !== tailRef) continue;
                    lured++;
                    WorldFeedback.keep(world, "world_combat:move_shedtail/link/" + ref, shedtailScene, 1, centre,
                        { moment: "link", path: [tailRef, ref], lured: lured }, Math.max(12, 28));
                }
                WorldFeedback.onEffect(world, brain.id(), "world_combat:move_shedtail:lure", shedtailScene, 1, centre,
                    { moment: "lure", radius: radius, scale: 1, intensity: Math.min(2, lured / 2), lured: lured });
                if (lured > 0) world.sound("minecraft:entity.phantom.flap", centre, 14, "{}");
                brain.schedule("lure", "lure", 20, "{}");
            }
        },
        end: function (brain) {
            const world = brain.world();
            let state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            // 自己的租约随脑作用域交还；这里只放收尾画面，不撤别人。
            if (!state.point || state.point.length !== 3) return;
            let anchor = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            try { const body = world.observe(brain.target()); if (body) anchor = body.position(); } catch (unavailable) { }
            const broken = brain.reason() !== "expired";
            WorldFeedback.emit(world, shedtailScene, 1, anchor, { moment: broken ? "break" : "expire", scale: state.appearance }, 24);
            WorldFeedback.text(world, anchor.plus(WorldCombat.point(0, 1.1, 0)),
                broken ? shedtailBreakText : shedtailExpireText, [], 26);
            world.sound(broken ? "minecraft:block.slime_block.break" : "minecraft:block.beacon.deactivate", anchor, 16, "{}");
        }
    });

    define({
        freeMovement: true,
        id: "shedtail",
        name: "Shed Tail",
        description: "支付一半最大生命，留下可被打碎的尾巴，沿有支撑的退路抽身；有后备时在落点换手。尾巴短暂吸引附近看得见它的敌人，并维持已接受的追击。",
        uses: ["被打崩前脱身，把追兵留给一条尾巴", "在狭窄地形用尾巴堵住追路", "把敌人的目标从自己身上引开"],
        kind: "motion",
        range: 5,
        maxRange: 12,
        prepare: 10,
        active: 2,
        recover: 8,
        cooldown: 96,
        style: "contact",
        defaults: { ward: 1.0, ai: { reserveHealth: 0.15, release: "owner", leaveStation: false } },
        fields: [
            field(pathOf("ward"), "尾巴厚度", "choice", { options: [
                { value: 0.6, label: "远遁" }, { value: 1.0, label: "标准" }, { value: 1.4, label: "保尾" }] })
        ],
        indicator: function (config) { return { radius: 5, geometry: "line", style: "contact", color: 0xB0705A, label: "断尾" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["shedtail"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const ward = Number(config && config.ward) || 1;
            return {
                prepare: p("shedtail", "prepare", context),
                recover: p("shedtail", "recover", context) + (ward <= 0.6 ? -2 : ward >= 1.4 ? 2 : 0),
                cooldown: Math.round(p("shedtail", "cooldown", context) * (ward <= 0.6 ? 0.88 : ward >= 1.4 ? 1.15 : 1)),
                range: p("shedtail", "retreat", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            if (body === null) return "target-left";
            if (MobEffects.read(world, actor, shedtailStatus) !== null) return "already-shed";
            // 手动施放的底线只是付得起这一半生命；AI 才额外保留 reserveHealth，二者不混同。
            const cost = body.maxHealth() * p("shedtail", "cost", action);
            if (body.health() <= cost) return "insufficient-health";
            const destination = action.targetPosition();
            if (destination.minus(action.origin()).length() > p("shedtail", "retreat", action) + 0.5) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            action.present("world_combat:move_shedtail:windup", shedtailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            // 预告实际会留下的尾巴耐久与自己能撤开的距离，与执行读同一份参数。
            if (body !== null) {
                const tail = Math.max(1, Math.round(body.maxHealth() * p("shedtail", "tail", action)));
                const retreat = Math.round(shedtailRoute(action, world, body).clear * 10) / 10;
                action.present("world_combat:move_shedtail:preview", "world_combat:feedback", 1, action.origin(),
                    JSON.stringify({ kind: "world-text", start: world.tick(), duration: prepare + 6, key: shedtailPreviewText, args: [tail, retreat] }));
            }
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            // A real health-cost receipt must cover the full half-health payment before a tail is spawned.
            const due = body.maxHealth() * p("shedtail", "cost", action);
            const paid = world.payHealth(due, "world_combat:shedtail_cost");
            if (!(paid > 0) || paid < due - 1e-6) {
                if (paid > 0 && world.valid(actor)) world.health(actor, paid, "world_combat:shedtail_refund");
                done(action); return;
            }
            const journey = WorldFeedback.actionScenes(shedtailScene);
            const route = shedtailRoute(action, world, body), feet = route.feet, heading = route.heading, clear = route.clear;
            const tailRatio = p("shedtail", "tail", action);
            const tailHealth = Math.max(1, body.maxHealth() * tailRatio);
            const tailTicks = Math.max(1, Math.round(p("shedtail", "tailTicks", action)));
            const appearance = Math.max(0.5, Math.min(1.3, tailRatio / 0.25));
            let tail: CombatActor | null = null;
            try {
                tail = WorldBodies.spawn(world, feet, {
                    appearance: { item: "minecraft:rotten_flesh", scale: appearance },
                    size: [0.9, 0.9], health: tailHealth, speed: 0, gravity: false, pushable: false,
                    invulnerable: false, silent: true, knockbackResistance: 0.35
                }, shedtailTail, { owner: String(actor.ref()), point: [feet.x(), feet.y(), feet.z()],
                    lureRange: p("shedtail", "lureRange", action), appearance: appearance, seeded: false, accepted: [] }, tailTicks);
            } catch (error) { tail = null; }
            if (tail === null) {
                if (world.valid(actor)) world.health(actor, paid, "world_combat:shedtail_refund");
                done(action);
                return;
            }
            world.sound("cobblemon:move.quickattack.actor", feet, 16, "{}");
            const path: number[][] = [[feet.x(), feet.y(), feet.z()]];
            const pace = clear <= 0.01 ? 0 : Math.max(0.8, clear / 4);
            let travelled = 0, elapsed = 0, settled = false;

            function sync(current: CombatAction): void {
                const last = path[path.length - 1];
                journey.show(current, "depart", WorldCombat.point(last[0], last[1], last[2]),
                    { moment: "depart", direction: [heading.x(), 0, heading.z()], path: path,
                      moved: Math.round(travelled * 100) / 100, clear: Math.round(clear * 100) / 100, scale: appearance });
            }
            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), stand = scope.observe(actor);
                const landing = stand === null ? feet : partyFeet(stand);
                const reserve = partyReserve(partyRoster(scope, actor), partyActiveId(scope, actor));
                if (reserve !== null) WorldBodies.operate(scope, tail!, "world_combat:shedtail/handoff",
                    { slot: reserve.slot, id: reserve.id, point: [landing.x(), landing.y(), landing.z()] });
                journey.finish(current, done);
            }
            function advance(current: CombatAction): void {
                const remaining = clear - travelled;
                if (remaining <= 0.02 || elapsed >= 20) { settle(current); return; }
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { settle(current); return; }
                const supported = shedtailClearReach(scope, partyFeet(self), heading, Math.min(pace, remaining), self.width(), self.height());
                if (!(supported > 0.001)) { settle(current); return; }
                const applied = scope.displace(actor, heading.scale(supported));
                if (!(applied > 0.001)) { settle(current); return; }
                travelled += applied; elapsed += 1;
                const after = scope.observe(actor);
                if (after !== null) { const actual = partyFeet(after); path.push([actual.x(), actual.y(), actual.z()]); }
                sync(current);
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sync(action);
            if (pace > 0) advance(action); else settle(action);
        }
    });
}
