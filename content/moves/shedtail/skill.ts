/**
 * 断尾 / shedtail 的出手方式与工作效果。
 *
 * 念头的形状（两幕 + 持续）：
 *  1) 断——支付一半最大生命，在自己原来的位置留下一条真实的尾巴（`WorldBodies` 自持实体，脑
 *     `world_combat:move/shedtail/tail`），自己沿选定的方向抽身离开；撤走前先用原生 free-space 探针
 *     验一条连续可达的段，碰墙就缩短，逐刻走完并把这段真实路径交给表现；给施法者带上共享身份
 *     `world_combat:status/shed_tail`，只作为「这次已经断过尾」的短标记。
 *  2) 拖住——尾巴每 20 刻把牵引范围内的敌人重新引向自己（`world.target`）；只有真的被引动的敌人才画连线，
 *     免疫诱饵的目标不表现被控制，也不强行转 Boss 仇恨。替撤走的施法者拖住追兵。
 *  3) 结束——尾巴被打碎（break）或时间走完（expire）：清掉身份、放出收尾画面。
 *
 * 尾巴属于它自己：施法者被收回、换手退场、区块卸载与重启都不再让它消失；它按自己的耐久挨打，到点或
 * 被打碎才结束。召回会带走施法者身上的短标记，但不会带走尾巴。召唤者（summoner）用于保留原生友敌关系；
 * 尾巴自身是独立实体，与施法者分开。
 *
 * 与同族的替身分开：替身是「你留下、影子挡在前面承伤」；断尾是「你走、尾巴留在原地把敌人引住」。
 * 提交前只观察并在 `windup` 预告；提交后才触碰世界。
 */
namespace PokemonSkills {
    const shedtailScene = "world_combat:move_shedtail";
    const shedtailTail = "world_combat:move/shedtail/tail";
    const shedtailStatus = "world_combat:shed_tail";
    const shedtailText = "world_combat.move.shedtail.text.shed";
    const shedtailBreakText = "world_combat.move.shedtail.text.break";
    const shedtailExpireText = "world_combat.move.shedtail.text.expire";
    const shedtailSwitchText = "world_combat.move.shedtail.text.switch";

    /**
     * How far the caster can actually walk from its feet before the first blocked foot-space, capped at `budget`.
     * Uses the native free-space probe (via LivingActions) so the retreat never claims a reachable segment through a
     * wall; when the host has no probe the authored budget is kept and native displace still stops at the first
     * obstruction. The same number drives the visible trail, so mechanics and presentation read one path.
     */
    export function shedtailClearReach(world: CombatWorld, feet: CombatPoint, heading: CombatPoint, budget: number,
        width: number, height: number): number {
        if (!(budget > 0) || heading.length() < 0.01) return 0;
        if (!LivingActions.hasFreeSpace(world)) return budget;
        const fine = 0.4, count = Math.ceil(budget / fine);
        let clear = 0;
        for (let index = 1; index <= count; index++) {
            const distance = Math.min(index * fine, budget);
            if (!LivingActions.freeSpace(world, feet.plus(heading.scale(distance)), width, height)) break;
            clear = distance;
            if (distance >= budget - 1e-6) break;
        }
        return clear;
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
        operations: { "world_combat:dispel": function (brain) { brain.end(); } },
        handlers: {
            lure: function (brain) {
                const world = brain.world(), state = JSON.parse(brain.state());
                const tail = world.observe(brain.target());
                if (tail === null) { brain.end(); return; }
                const centre = tail.position(), actors = world.query(centre, state.lureRange, false);
                const tailRef = String(brain.target().ref());
                let lured = 0;
                const links: (string | number[])[] = [];
                for (let index = 0; index < actors.length; index++) {
                    const other = actors[index], facts = world.observe(other);
                    if (String(other.ref()) === tailRef) continue;
                    if (facts === null || facts.friendly() || facts.health() <= 0) continue;
                    // Only a real retarget is shown; a target that refuses the lure (immune Boss) draws nothing.
                    if (world.target(other, brain.target())) { lured++; links.push(tailRef, String(other.ref())); }
                }
                WorldFeedback.onEffect(world, brain.id(), "world_combat:move_shedtail:lure", shedtailScene, 1, centre,
                    { moment: "lure", scale: state.lureRange / 8, intensity: Math.min(2, lured / 2), lured: lured, path: links });
                if (lured > 0) world.sound("minecraft:entity.phantom.flap", centre, 14, "{}");
                brain.schedule("lure", "lure", 20, "{}");
            }
        },
        end: function (brain) {
            const world = brain.world();
            let state: any = {};
            try { state = JSON.parse(brain.state()); } catch (error) { state = {}; }
            // The brain's exact native carrier lease is released even when the body was killed.
            if (!state.point || state.point.length !== 3) return;
            const anchor = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
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
        description: "削掉自己一半生命，在原地留下一条会拖住敌人的尾巴，自己沿选定方向抽身离场；有后备时直接与待命的一只换手。尾巴在被打碎或自行消散前，会把附近的敌人重新引向尾巴。",
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
            const cost = body.maxHealth() * p("shedtail", "cost", action);
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.15;
            if (body.health() <= cost + body.maxHealth() * reserve) return "insufficient-health";
            const destination = action.targetPosition();
            if (destination.minus(action.origin()).length() > p("shedtail", "retreat", action) + 0.5) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shedtail:windup", shedtailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const cost = body.maxHealth() * p("shedtail", "cost", action);
            const paid = -world.health(actor, -cost, "world_combat:shedtail_cost");
            if (paid < 1) { done(action); return; }
            const journey = WorldFeedback.actionScenes(shedtailScene);
            const origin = action.origin(), destination = action.targetPosition();
            const feet = WorldCombat.point(origin.x(), origin.y() - body.height() / 2, origin.z());
            let direction = destination.minus(origin);
            if (direction.length() < 0.01) direction = action.direction();
            direction = direction.length() < 0.01 ? WorldCombat.point(0, 0, 1) : direction.unit();
            const planar = WorldCombat.point(direction.x(), 0, direction.z());
            const heading = planar.length() < 0.01 ? WorldCombat.point(0, 0, 1) : planar.unit();
            const aimed = destination.minus(origin).length();
            const retreatBudget = p("shedtail", "retreat", action);
            const retreat = Math.max(0, Math.min(retreatBudget, aimed > 0.01 ? aimed : retreatBudget));
            // Walk the segment first: the reachable length is the same true distance the visible trail will show.
            const clear = shedtailClearReach(world, feet, heading, retreat, body.width(), body.height());
            const tailRatio = p("shedtail", "tail", action);
            const tailHealth = Math.max(1, body.maxHealth() * tailRatio);
            const tailTicks = Math.max(1, Math.round(p("shedtail", "tailTicks", action)));
            const appearance = Math.max(0.5, Math.min(1.3, tailRatio / 0.25));
            // 尾巴是自持实体：召唤者是施法者（保留原生友敌关系），但尾巴本身独立，召回不会带走它。
            let tail: CombatActor | null = null;
            try {
                tail = WorldBodies.spawn(world, feet, {
                    appearance: { item: "minecraft:rotten_flesh", scale: appearance },
                    size: [0.9, 0.9], health: tailHealth, speed: 0, gravity: false, pushable: false,
                    invulnerable: false, silent: true, knockbackResistance: 0.35
                }, shedtailTail, { owner: String(actor.ref()), point: [feet.x(), feet.y(), feet.z()],
                    lureRange: p("shedtail", "lureRange", action), appearance: appearance }, tailTicks);
            } catch (error) { tail = null; }
            if (tail === null) {
                if (world.valid(actor)) world.health(actor, paid, "world_combat:shedtail_refund");
                done(action);
                return;
            }
            world.sound("cobblemon:move.quickattack.actor", feet, 16, "{}");
            const bodyHeight = body.height();
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
                const at = stand === null ? feet : stand.position();
                // 有合法后备时真正换手：收回自己、让后备在撤离落点登场，尾巴留在原地。
                const reserve = partyReserve(partyRoster(scope, actor), partyActiveId(scope, actor));
                if (reserve !== null) {
                    WorldFeedback.emit(scope, shedtailScene, 1, at,
                        { moment: "switch", direction: [heading.x(), 0, heading.z()], scale: appearance }, 26);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), shedtailSwitchText, [], 26);
                    partySwitchOut(scope, actor, reserve.slot, at);
                }
                journey.finish(current, done);
            }
            function advance(current: CombatAction): void {
                const remaining = clear - travelled;
                if (remaining <= 0.02 || elapsed >= 20) { settle(current); return; }
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { settle(current); return; }
                const applied = scope.displace(actor, heading.scale(Math.min(pace, remaining)));
                if (!(applied > 0.001)) { settle(current); return; }
                travelled += applied; elapsed += 1;
                const after = scope.observe(actor);
                if (after !== null) path.push([after.position().x(), after.position().y() - bodyHeight / 2, after.position().z()]);
                sync(current);
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sync(action);
            if (pace > 0) advance(action); else settle(action);
        }
    });
}
