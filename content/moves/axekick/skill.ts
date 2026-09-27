/**
 * 下压踢 / axekick 的出手方式。
 *
 * 核心念头：一次短垫步后原地抬腿高劈、脚踵真实往下扫过一条固定窄带的两拍动作。先朝准心垫一小步站定，
 * 把腿抬到高处并亮出面前那条窄带的真实长宽（是对手读得到的预告），再让脚踵从带顶逐刻往下扫：
 * 每刻只砍当前那一薄层，判定用真实身体箱相交，表现发出同一段下落端点。扫中会砸乱对手的架势，
 * 有概率把它劈得恍惚。整条带扫空，脚踵才砸地、按实际损失自伤一截。
 *
 * 三幕（提交后由共享节奏驱动 execute）：
 *   起（windup，提交前）：抬腿蓄势，只播预告，可免费打断。
 *   抬（step → raise）：朝准心短垫一步（撞墙即停），站定亮出面前窄带的真实长宽 telegraph 刻。
 *   劈（chop）：脚踵从带顶逐刻下扫一薄层。每层的判定是带底面的真实长方柱与该层高度带之交（selectBodies +
 *       bodyPolygon），命中的是这一层里脚踵最先够到的真实身体箱。命中即结算接触伤害、掷一次 dazeChance
 *       决定是否挂本单元恍惚载体（共享身份 world_combat:status/confusion）、并用 hitDisplace 撞开 shove 格；
 *       整条带扫空才脚踵砸地、按 crash 自伤。不凭旧 target 补中，也不把整个人送出去。
 *
 * 选取 `kind: "aim"`：朝自由方向或世界点抬腿都行，target 为 null、目标离场、空劈都成立；方向交给 aim()。
 *
 * 已承担的空劈风险：一旦开始下扫，取消（硬中断）也不能免掉约定的落空代价。落空的账记在一个 actor 托管的
 * 债务效果上：动作正常结算时撤销债务；动作被打断时，债务在自己的作用域里补付 crash，而不是靠已消失的
 * action.after。
 *
 * 恍惚行为（本单元写）：被劈晕的目标每次直接进攻（DamageSemantics.directOffense）按自身攻击结算一道自伤，
 * 同一次多段进攻的各个子段只算一次；毒、持续场伤等残留伤害不算直接进攻，不触发。消费方用
 * CombatStatus.has(world, actor, "confusion") 按身份读取。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、位移（hitDisplace）与状态
 * （真实 MC MobEffect）都走同一条路。
 */
namespace PokemonSkills {
    const axekickScene = "world_combat:move_axekick";
    const axekickRing = "world_combat:axekick_ring";
    const axekickDebt = "world_combat:axekick_debt";
    const axekickHitText = "world_combat.move.axekick.text.hit";
    const axekickCrashText = "world_combat.move.axekick.text.crash";
    const axekickDazeText = "world_combat.move.axekick.text.daze";
    const axekickRecoilFraction = 0.05;
    /** 同一直接进攻身份只反噬一次；空键留给逐次原生攻击。 */
    const axekickRecoilSeen: { [ref: string]: { instance: string; tick: number } } = Object.create(null);

    function axekickAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /** 本单元自己的恍惚载体：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function axekickCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === axekickRing ? effect : null;
    }

    /** 这个动作实例现在是否仍在该生物身上运行；债务效果据此判断「结算」还是「被打断」。 */
    function axekickActionActive(world: CombatWorld, instance: number): boolean {
        const actions = world.actions();
        for (let index = 0; index < actions.length; index++)
            if (Number(actions[index].instance()) === instance) return true;
        return false;
    }

    /** 真实落空：只在脚踵够到地面、且确实扣到生命时发出反馈；返回本次实际损失。 */
    function axekickCrashPay(world: CombatWorld, self: CombatActor, at: CombatPoint, crash: number, dust: number, scale: number): number {
        const body = world.observe(self);
        if (body === null) return 0;
        const loss = -world.health(self, -body.maxHealth() * crash, "world_combat:crash");
        if (!(loss > 0)) return 0;
        WorldFeedback.emit(world, axekickScene, 1, at,
            { moment: "crash", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash * 4)), dust: dust }, 24);
        WorldFeedback.text(world, axekickAbove(at), axekickCrashText, [], 26);
        world.sound("minecraft:entity.generic.big_fall", at, 16, "{}");
        return loss;
    }

    // actor 托管的空劈债务：动作被取消时，在它自己的作用域里补付约定的落空代价，不依赖已消失的 action.after。
    WorldCombat.effect(axekickDebt, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["instance", "crash", "dust", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid axekick debt: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(axekickDebt, "start", function (effect) {
        const world = effect.world();
        if (!world.valid(effect.target())) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(axekickDebt, "watch", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const instance = Number(data.instance);
        if (axekickActionActive(world, instance)) { effect.schedule("watch", "watch", 1, "{}"); return; }
        // 正常结束（stage=finished）不补付；只有被取消/打断才结清已承担的空劈代价。
        const receipt = world.action(instance);
        if (receipt !== null && String(receipt.stage()) === "finished") { effect.end(); return; }
        const body = world.observe(self);
        if (body !== null) axekickCrashPay(world, self, body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0)),
            data.crash, data.dust, data.scale);
        effect.end();
    });
    WorldCombat.effectHandler(axekickDebt, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: true,
        id: "axekick",
        cooldownParameter: "recharge",
        name: "Axe Kick",
        description: "朝任意方向短垫一步后原地抬腿，脚跟从面前一条固定窄带的顶端逐刻下扫，命中造成伤害并有几率使目标恍惚；整条带扫空时脚踵砸地、自己受伤。",
        uses: ["用一记直落的下劈砸穿硬目标", "给刚起手或刚增益的对手一记恍惚", "贴脸时用最轻自伤的一记收尾"],
        kind: "aim",
        range: 4.0,
        maxRange: 6.5,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 28,
        style: "aerial",
        maximumTicks: 220,
        interruptible: false,
        defaults: { high: false, ai: { maxChase: 8, spareConfused: true, minSelf: 0.2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("axekick", "reach", pokemon), geometry: "line", style: "aerial", color: 0x9B6BE0,
                label: config && config.high === true ? "高劈" : "低位快劈" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["axekick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("axekick", "tempo", context)),
                recover: Math.round(p("axekick", "aftercast", context)),
                cooldown: Math.round(p("axekick", "recharge", context)),
                range: p("axekick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("axekick:windup", axekickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", high: config && config.high === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(axekickScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }

            action.releaseTarget();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const step = Math.max(0.2, p("axekick", "step", action));
            const reach = Math.max(1.2, p("axekick", "reach", action));
            const bandHeight = Math.max(0.8, p("axekick", "hopHeight", action));
            const halfWidth = Math.max(0.2, p("axekick", "hitRadius", action));
            const hopSpeed = Math.max(0.45, p("axekick", "hopSpeed", action));
            const chopSpeed = Math.max(0.4, p("axekick", "chopSpeed", action));
            const raiseTicks = Math.max(6, Math.round(16 / hopSpeed));
            // 真实下扫时长：脚踵从带顶分段落到地面，时长仍由下劈速度决定。
            const chopTicks = Math.max(4, Math.round(15 / chopSpeed));
            const telegraph = Math.max(1, Math.round(p("axekick", "telegraph", action)));
            const power = p("axekick", "chop", action);
            const crash = Math.max(0.03, Math.min(0.6, p("axekick", "crash", action)));
            const shove = Math.max(0, p("axekick", "shove", action));
            const dust = Math.max(4, Math.round(p("axekick", "dust", action)));
            const dazeChance = p("axekick", "dazeChance", action);
            const fumbleChance = p("axekick", "fumbleChance", action);
            const dazeTicks = Math.max(20, Math.round(p("axekick", "dazeTicks", action)));
            const scale = Math.max(0.5, Math.min(2, halfWidth / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 120));
            let finished = false;
            let debt = 0;

            function finish(current: CombatAction): void { if (!finished) { finished = true; movementScenes.finish(current, done); } }
            function disarm(current: CombatAction): void {
                if (debt <= 0) return;
                current.world().operation(debt, "world_combat:dispel", "{}");
                debt = 0;
            }

            function bandCorners(feet: CombatPoint): CombatPoint[] {
                const near = 0.15, far = 0.15 + reach;
                const at = function (distance: number, across: number): CombatPoint {
                    return WorldCombat.point(feet.x() + heading.x() * distance + side.x() * across, feet.y(),
                        feet.z() + heading.z() * distance + side.z() * across);
                };
                return [at(far, halfWidth), at(far, -halfWidth), at(near, -halfWidth), at(near, halfWidth)];
            }
            function coords(list: CombatPoint[]): number[][] {
                return list.map(function (value) { return [value.x(), value.y(), value.z()]; });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");

            function settle(current: CombatAction): void {
                disarm(current);
                movementScenes.stop(current);
                finish(current);
            }

            function daze(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                const live = current.world();
                const ticks = dazeTicks;
                if (live.random() >= dazeChance) return;
                if (!CombatStatus.apply(live, victim, "confusion", axekickRing, ticks, Math.round(fumbleChance * 100), { unique: true })) return;
                const body = live.observe(victim);
                const point = body === null ? at : body.position();
                WorldFeedback.emit(live, axekickScene, 1, point,
                    { moment: "daze", target: String(victim.ref()), scale: scale, chance: dazeChance,
                        intensity: Math.max(0.6, Math.min(2, dazeChance * 3)) }, 40);
                WorldFeedback.text(live, axekickAbove(point), axekickDazeText, [Math.round(ticks / 20)], 42);
                sound(current, "cobblemon:status.volatile.confusion.actor");
            }

            function crashLanding(current: CombatAction, at: CombatPoint): void {
                disarm(current);
                const live = current.world();
                axekickCrashPay(live, actor, at, crash, dust, scale);
                current.after(5, function (next) { settle(next); });
            }

            function impactOn(current: CombatAction, victim: CombatActor, centre: CombatPoint): void {
                const live = current.world();
                const body = live.observe(victim);
                const point = body === null ? centre : body.position();
                if (!hurt(current, victim, "axekick", power, { damage: damageSpec("axekick", "chop"), contact: true })) {
                    crashLanding(current, centre); return;
                }
                disarm(current);
                if (live.valid(victim)) {
                    const me = live.observe(actor);
                    const away = me === null ? heading : point.minus(me.position());
                    const flat = WorldCombat.point(away.x(), 0, away.z());
                    const push = flat.length() < 0.01 ? heading : flat.unit();
                    live.hitDisplace(victim, push.scale(shove));
                }
                const head = body === null ? centre : body.position().plus(WorldCombat.point(0, body.height() * 0.45, 0));
                WorldFeedback.emit(live, axekickScene, 1, head,
                    { moment: "impact", scale: scale, intensity: intensity, count: Math.round(18 + power * 0.35) }, 28);
                sound(current, "cobblemon:impact.fighting");
                sound(current, "minecraft:entity.player.attack.sweep");
                WorldFeedback.text(live, axekickAbove(point), axekickHitText, [], 26);
                if (live.valid(victim)) daze(current, victim, point);
                current.after(5, function (next) { settle(next); });
            }

            /** 短垫步：沿准心向前一小步，撞到实体或方块就停在原地，不把整个人送出去。 */
            function stepPhase(current: CombatAction): void {
                const live = current.world();
                const swept = sweepStep(current, heading.scale(step), 0.3);
                const hit = swept.hit;
                if (!hit.blocked() && !hit.hitEntity() && swept.remaining.length() > 0.001) live.displace(actor, swept.remaining);
                raise(current, 0);
            }

            /** 站定亮出窄带的真实长宽，等到 telegraph 刻才劈下——这段停顿是对手让开的窗口。 */
            function raise(current: CombatAction, wait: number): void {
                const live = current.world(), me = live.observe(actor);
                if (me === null) { finish(current); return; }
                const feet = me.position().minus(WorldCombat.point(0, me.height() * 0.5, 0));
                const corners = bandCorners(feet);
                const centre = WorldCombat.point((corners[0].x() + corners[2].x()) / 2, feet.y(), (corners[0].z() + corners[2].z()) / 2);
                movementScenes.show(current, "raise", feet, { moment: "raise", raiseTicks: raiseTicks,
                    path: coords(corners), top: feet.y() + bandHeight,
                    scale: scale, intensity: intensity, dust: dust });
                if (wait >= telegraph) { chop(current, feet, corners, centre); return; }
                current.after(1, function (next) { raise(next, wait + 1); });
            }

            /** 脚踵从带顶逐刻下扫一薄层：判定与表现共用这一层的高度与带的底面顶点。 */
            function chop(current: CombatAction, feet: CombatPoint, corners: CombatPoint[], centre: CombatPoint): void {
                movementScenes.stop(current, "raise");
                debt = current.world().effect(axekickDebt, actor,
                    JSON.stringify({ instance: current.id(), crash: crash, dust: dust, scale: scale }), 600);
                let heelY = feet.y() + bandHeight;
                const stepDown = bandHeight / chopTicks;

                function cut(next: CombatAction): void {
                    const live = next.world(), me = live.observe(actor);
                    if (me === null) { disarm(next); finish(next); return; }
                    const top = heelY, bottom = Math.max(feet.y(), top - stepDown);
                    let victim: CombatActor | null = null, bestTop = -1e9, bestGap = 1e9;
                    WorldGeometry.selectBodies(live, WorldGeometry.bodyPolygon(corners, bottom, top), function (candidate, facts) {
                        if (String(candidate.ref()) === String(actor.ref()) || facts.friendly()) return;
                        if (!live.clear(feet.plus(WorldCombat.point(0, 0.4, 0)), facts.position())) return;
                        const reachTop = facts.boundsMax().y(), gap = facts.position().minus(feet).length();
                        if (reachTop > bestTop + 1e-6 || (Math.abs(reachTop - bestTop) <= 1e-6 && gap < bestGap)) {
                            bestTop = reachTop; bestGap = gap; victim = candidate;
                        }
                    });
                    movementScenes.show(next, "chop", WorldCombat.point(centre.x(), bottom, centre.z()),
                        { moment: "chop", direction: [0, -1, 0], path: [[centre.x(), top, centre.z()], [centre.x(), bottom, centre.z()]],
                            scale: scale, intensity: intensity, dust: dust });
                    heelY = bottom;
                    if (victim !== null) { impactOn(next, victim, WorldCombat.point(centre.x(), bottom, centre.z())); return; }
                    if (heelY <= feet.y() + 1e-4) { crashLanding(next, WorldCombat.point(centre.x(), feet.y(), centre.z())); return; }
                    next.after(1, function (following) { cut(following); });
                }
                cut(current);
            }

            stepPhase(action);
        }
    });


    // 反噬：被劈晕的目标每次直接进攻（多段只算一次）打中非友方时，按自身攻击结算一道自伤；
    // 毒、场伤等残留伤害不算直接进攻，不触发。
    WorldCombat.on("world_combat:move_axekick/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (!DamageSemantics.directOffense(data)) return;
        if (axekickCarrier(world, actor) === null) return;
        const instance = String(world.originInstance() || "");
        const key = String(actor.ref()), seen = axekickRecoilSeen[key];
        if (seen && world.tick() - seen.tick > 200) delete axekickRecoilSeen[key];
        if (instance !== "" && seen && seen.instance === instance) return;
        if (instance !== "") axekickRecoilSeen[key] = { instance: instance, tick: world.tick() };
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = axekickRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        WorldFeedback.emit(world, axekickScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()) }, 22);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 恍惚存续期：目标头顶低密度绕一圈困惑气泡，每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_axekick/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== axekickRing) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "axekick:" + String(actor.ref()), axekickScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
