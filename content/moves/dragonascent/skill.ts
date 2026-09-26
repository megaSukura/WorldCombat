/**
 * 画龙点睛 / dragonascent 的出手方式。
 *
 * 核心念头：**先窜上天，再从正上方把整个身体砸下来**——落地一圈冲击波把周围的人一起震开、地面留下裂石。
 *   它是全族里唯一要走「升空」这一幕的招，也是唯一从天而降的一记；弃守的根据是「离了天、落地那一刻门户大开」。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：屈腿蓄势、气流在脚下收拢，只播预告（`windup`），此时代价未结清。
 *   升（guard → climb）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付），
 *       随后垂直窜上 `altitude` 高度；头顶被压住时能升多少算多少，从这里就开始俯冲。
 *   坠（dive → land）：从最高点沿一条指向落点的斜线俯冲，逐刻推进并 trace；途中第一位非友方接触结算一记
 *       `dive` 接触伤害并记进本招的已命中集合；落地（命中、撞地或走完 `swoop`）时在真实落点荡出 `ring` 半径的冲击波。
 *       落地主目标：俯冲没撞到它（或没指定实体、只瞄了落点）时由它吃下整记伤害并沿远离落点方向震开 `shock` 格；
 *       俯冲途中已经吃过整记的对象只再吃 `share` 保留，不会被同一招连吃两份满额。广域式还波及落点周围的其他敌人。
 *   散（slump）：落地后重心一沉，身上浮起脱力灰气并浮字提示降级。
 *
 * 选取 `kind: "aim"`：瞄落点或敌人都行，起降路径受实际障碍限制；落地只取本体真正到达的位置。
 *
 * 与同族分开：近身战贴脸连打、突飞猛扑贴地冲、铠农炮在远处；与勇鸟猛攻比：勇鸟从空中沿一条线水平穿过目标、
 *   能串起一串；画龙点睛是垂直下砸、落点一圈冲击波，只照顾落点附近，且必须先爬升。
 *
 * 配置 `broad`（广域式）由 `resolve` 改时序、由公式改威力／半径／保留／击退，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const dragonascentScene = "world_combat:move_dragonascent";
    const dragonascentSlumpText = "world_combat.move.dragonascent.text.slump";
    const dragonascentLandText = "world_combat.move.dragonascent.text.land";

    define({
        freeMovement: true,
        id: dragonascentId,
        cooldownParameter: "recharge",
        name: "Dragon Ascent",
        description: "先窜上高空，再从正上方俯冲砸向目标：俯冲途中撞到谁就按接触结算，落地冲击波再打到落点主目标、把被波及的人沿远离落点的方向推开，并在地面留下裂石。一发动就付出自身防御与特防各下降一级的代价；广域式冲击更宽、能波及周围敌人并震得更远，代价是坠落威力更低。",
        uses: ["升空后从正上方砸向一个目标", "落地冲击波收尾并推开被波及的敌人", "越过前排直接砸到后面的目标"],
        kind: "aim",
        range: 4.0,
        maxRange: 7.0,
        prepare: 12,
        active: 0,
        recover: 12,
        cooldown: 40,
        maximumTicks: 220,
        style: "aerial",
        defaults: { broad: false, ai: { maxChase: 11, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(dragonascentId, "reach", pokemon) : 4.0, geometry: "line", style: "aerial",
                color: 0x7FC8D8, label: config && config.broad === true ? "画龙点睛·广域式" : "画龙点睛·贯坠式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dragonascentId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const broad = !!(config && config.broad);
            return {
                prepare: Math.round(p(dragonascentId, "tempo", context)),
                recover: Math.round(p(dragonascentId, "aftercast", context)),
                cooldown: Math.round(p(dragonascentId, "recharge", context)),
                active: 0,
                range: p(dragonascentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragonascent:ready", dragonascentScene, 1, action.origin(),
                JSON.stringify({ moment: "ready", broad: config && config.broad === true ? 1 : 0,
                    motes: Math.round(p(dragonascentId, "motes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(dragonascentScene);
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            // aim 接受实体或世界点：没有实体目标时落点就是选中的那个点。
            const targetRef = target !== null ? String(target.ref()) : "";
            const dive = p(dragonascentId, "dive", action);
            const altitude = p(dragonascentId, "altitude", action);
            const pace = Math.max(0.2, p(dragonascentId, "pace", action));
            const radius = p(dragonascentId, "radius", action);
            const ring = p(dragonascentId, "ring", action);
            const share = p(dragonascentId, "share", action);
            const shock = p(dragonascentId, "shock", action);
            const motes = Math.round(p(dragonascentId, "motes", action));
            const guardLoss = Math.max(0, Math.round(p(dragonascentId, "guardLoss", action)));
            const poiseLoss = Math.max(0, Math.round(p(dragonascentId, "poiseLoss", action)));
            const broad = !!(config && config.broad);
            const intensity = Math.max(0.5, Math.min(2.4, dive / 120));
            const scale = Math.max(0.6, Math.min(2.2, ring / 2.0));
            const committed = WorldGeometry.flatUnit(aim(action), action.direction());
            const up = WorldCombat.point(0, 1.5, 0);
            // struckRef：本招途中已经吃过整记 `dive` 的对象；落地共享这个集合，不重复满额。
            let direction = committed, swoop = 1.5, struckRef = "", settled = false;

            // 离天落地：弃守在提交那一刻付。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            WorldFeedback.emit(world, dragonascentScene, 1, action.origin(),
                { moment: "guard", guardLoss: guardLoss, poiseLoss: poiseLoss, broad: broad ? 1 : 0, motes: motes, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:move.gust.actor");

            function land(current: CombatAction, at: CombatPoint): void {
                movementScenes.stop(current);
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 先收集落点内的人，再决定主目标：指定了实体就用它，只瞄了点就用最近的那个。
                const found: { actor: CombatActor; facts: CombatObservation }[] = [];
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, ring, { below: 2.5, above: 3.0 }),
                    function (other, facts) { found.push({ actor: other, facts: facts }); });
                let anchorRef = targetRef;
                if (anchorRef === "" && found.length > 0) anchorRef = String(found[0].actor.ref());
                const anchorStruck = anchorRef !== "" && anchorRef === struckRef;
                WorldFeedback.emit(scope, dragonascentScene, 1, at,
                    { moment: "land", target: anchorRef, motes: motes, scale: scale,
                        intensity: anchorStruck ? intensity * 0.45 : intensity,
                        ring: ring, struck: anchorStruck ? 1 : 0, broad: broad ? 1 : 0 }, 32);
                sound(current, "cobblemon:impact.flying");
                sound(current, "minecraft:entity.generic.big_fall");
                let extra = 0;
                for (let i = 0; i < found.length; i++) {
                    const other = found[i].actor, facts = found[i].facts, ref = String(other.ref());
                    const isAnchor = ref === anchorRef, already = ref === struckRef;
                    const power = isAnchor && !already ? dive : dive * share;
                    if (power <= 0) continue;
                    if (hurt(current, other, dragonascentId, power, { damage: damageSpec(dragonascentId, "dive"), contact: true })) {
                        extra++;
                        const away = WorldCombat.point(facts.position().x() - at.x(), 0, facts.position().z() - at.z());
                        if (scope.valid(other) && away.length() > 0.05) scope.hitDisplace(other, away.unit().scale(shock));
                    }
                }
                const self = scope.observe(actor);
                if (self !== null) {
                    WorldFeedback.emit(scope, dragonascentScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLoss, poiseLoss: poiseLoss, extra: extra, motes: motes, scale: scale, intensity: intensity }, 28);
                    WorldFeedback.text(scope, self.position().plus(up), dragonascentSlumpText, [guardLoss, poiseLoss], 28);
                    if (extra > 0) WorldFeedback.text(scope, at.plus(up), dragonascentLandText, [extra], 24);
                }
                movementScenes.finish(current, done);
            }

            function diveStep(current: CombatAction, travelled: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { movementScenes.finish(current, done); return; }
                const step = Math.min(pace, Math.max(0, swoop - travelled));
                if (step <= 0.001) { land(current, self.position()); return; }
                const origin = self.position(), delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                let contact: CombatPoint | null = null;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (struckRef !== ref) {
                            const landed = impact(current, hit, dragonascentId, dive, { damage: damageSpec(dragonascentId, "dive"), contact: true });
                            // 伤害被拒绝时不记进已命中集合，也不冒称命中。
                            if (landed) {
                                struckRef = ref;
                                WorldFeedback.emit(scope, dragonascentScene, 1, hit.position(),
                                    { moment: "hit", target: ref, motes: motes, scale: scale, intensity: intensity }, 22);
                                sound(current, "cobblemon:impact.dragon");
                            }
                        }
                    }
                    contact = hit.position();
                }
                if (contact !== null) { land(current, contact); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= swoop) { land(current, current.origin()); return; }
                movementScenes.show(current, "dive", origin, { moment: "dive", direction: [direction.x(), direction.y(), direction.z()], motes: motes, scale: scale,
                        intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, swoop)) });
                current.after(1, function (next: CombatAction) { diveStep(next, travelled); });
            }

            function beginDive(current: CombatAction): void {
                movementScenes.stop(current, "climb");
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { movementScenes.finish(current, done); return; }
                const victim = targetRef.length > 0 ? scope.actor(targetRef) : null;
                const observed = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const aimPoint = observed !== null ? observed.position() : current.targetPosition();
                const heading = aimPoint.minus(self.position());
                direction = heading.length() < 0.3 ? committed : heading.unit();
                swoop = Math.max(1.2, heading.length() + 1.2);
                sound(current, "minecraft:entity.ender_dragon.flap");
                diveStep(current, 0);
            }

            function climb(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { movementScenes.finish(current, done); return; }
                if (climbed >= altitude - 0.05) { beginDive(current); return; }
                const rise = Math.min(pace, altitude - climbed);
                const moved = scope.displace(actor, WorldCombat.point(0, rise, 0));
                movementScenes.show(current, "climb", self.position(), { moment: "climb", motes: motes, scale: scale, intensity: intensity, ratio: Math.min(1, climbed / Math.max(0.001, altitude)) });
                if (moved < rise * 0.5) { beginDive(current); return; }
                current.after(1, function (next: CombatAction) { climb(next, climbed + moved); });
            }

            climb(action, 0);
        }
    });
}
