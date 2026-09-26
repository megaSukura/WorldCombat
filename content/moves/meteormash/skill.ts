/**
 * 彗星拳 / meteormash —— 注册与动作。
 *
 * 核心念头：先短靠一步进入拳程，再由上而下把一记燃着流星火的钢拳砸实；拳落之处炸开一圈碎石火星。
 *   正面砸中的吃重拳，落点周围的被震开。反震让机身发热，有概率把物攻抬一级。它是余波族里唯一的物理拳。
 *
 * 三幕：
 *   起（windup，提交前）：拳上聚起流星火花、脚下压出细尘，只播预告。
 *   冲（charge）：提交后沿瞄准方向以 `sweepStep` 短靠，只到一臂可及位置；靠步撞到实体或方块即停。
 *   砸（smash → hit / crash / miss）：从拳的起点（前上方）向前下方分 `sweep` 刻逐段 `trace` 扫下。真实首个
 *       实体或方块接触决定落拳点：正面目标吃 `impact`（punch、接触），落点 `crashRadius` 一圈内的其他敌人
 *       吃 `shock` 且须视线可达，被震开 `shove`，主目标不重复吃这一圈；撞墙只在墙面留尘与近侧冲力；
 *       空拳只拖星尾，不在射程末端凭空生成圆炸。地表不替换方块，焦痕由表现层的短陨星烫印承担。
 *
 * 总接触距离固定：靠步加拳程不超过 `reach`，所以远处的目标够不到就是够不到，不能靠两段距离翻倍。
 * `kind: "aim"`：可点实体，也可点地面／空中落点；提交不要求存在敌人。
 */
namespace PokemonSkills {
    const meteormashScene = "world_combat:move_meteormash";
    const meteormashSurgeText = "world_combat.move.meteormash.text.surge";
    const meteormashHitText = "world_combat.move.meteormash.text.hit";
    const meteormashMissText = "world_combat.move.meteormash.text.miss";

    define({
        freeMovement: true,
        id: "meteormash",
        cooldownParameter: "recharge",
        name: "Meteor Mash",
        description: "短靠一步再一拳砸下：正面命中的目标吃重拳，落点一圈内其他视线可达的敌人被震开并受伤，接触真实方块或地面只在表面迸出石屑；空拳不会凭空炸开。砸实的反震有概率把自身物攻抬一级。陨星式冲得更远、震得更广；重拳式拳更重、出手更利落。",
        uses: ["贴身用一记重拳点名一个目标", "顺带震开挤在目标身边的其他人", "用真实落拳点压住一个走位"],
        kind: "aim",
        range: 4.5,
        maxRange: 7,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 30,
        style: "meteorfist",
        defaults: { comet: false, ai: { maxChase: 9, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteormash", "crashRadius", pokemon), geometry: "area", style: "meteorfist", color: 0xC9A24A,
                label: config && config.comet === true ? "陨星式" : "彗星拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["meteormash"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("meteormash", "tempo", context)),
                recover: Math.round(p("meteormash", "aftercast", context)),
                cooldown: Math.round(p("meteormash", "recharge", context)),
                active: 0,
                range: p("meteormash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("meteormash:windup", meteormashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", reach: p("meteormash", "reach", action),
                    comet: config && config.comet === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(meteormashScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { scenes.finish(action, done); return; }
            const aimPoint = action.targetPosition();
            const heading = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            const power = p("meteormash", "impact", action);
            const shock = p("meteormash", "shock", action);
            const reach = Math.max(2.5, p("meteormash", "reach", action));
            const arm = Math.max(1.0, p("meteormash", "arm", action));
            const fist = Math.max(0.4, p("meteormash", "fist", action));
            const crashRadius = Math.max(1.0, p("meteormash", "crashRadius", action));
            const shove = p("meteormash", "shove", action);
            const scorch = Math.max(0.8, p("meteormash", "craterRadius", action));
            const scorchTicks = Math.max(40, Math.round(p("meteormash", "craterTicks", action)));
            const flare = Math.max(14, Math.round(p("meteormash", "flare", action)));
            const sweep = Math.max(3, Math.round(p("meteormash", "sweep", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("meteormash", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("meteormash", "surgeStages", action)));
            const start = body.position();
            const scale = Math.max(0.6, Math.min(2.2, crashRadius / 1.6));
            const intensity = Math.max(0.5, Math.min(2.6, power / 95));
            const budget = Math.max(1.5, reach);
            const forward = Math.min(arm, budget);
            const gap = WorldCombat.point(aimPoint.x() - start.x(), 0, aimPoint.z() - start.z()).length();
            const approach = Math.max(0, Math.min(budget - forward, gap - forward));
            const bodyRadius = Math.min(1, Math.max(0.3, body.width() * 0.5));
            let settled = false, directRef = "";

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 落拳收束：真实接触点结算主伤、一圈副伤与表现；空拳只拖星尾。 */
            function strike(current: CombatAction, contact: CombatImpact | null, tip: CombatPoint): void {
                const scope = current.world();
                scenes.stop(current, "smash");
                let land = tip, face = "", main = false;
                if (contact !== null && contact.hitEntity()) {
                    const victim = contact.target(), facts = victim === null ? null : scope.observe(victim);
                    land = facts === null ? contact.position() : facts.position();
                    if (victim !== null && facts !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        main = impact(current, contact, "meteormash", power,
                            { damage: damageSpec("meteormash", "impact"), contact: true, punch: true });
                        if (main) {
                            directRef = String(victim.ref());
                            WorldFeedback.emit(scope, meteormashScene, 1, land,
                                { moment: "hit", target: directRef, flare: flare, scale: scale, intensity: intensity }, 22);
                            sound(current, "cobblemon:impact.steel");
                        }
                    }
                } else if (contact !== null && contact.blocked()) {
                    const cell = contact.blockPosition();
                    land = cell === null ? contact.position() : cell;
                    face = contact.blockFace();
                }
                let hits = main ? 1 : 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(land, 0, crashRadius, { below: 2, above: 3 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    if (directRef !== "" && String(enemy.ref()) === directRef) return;
                    const point = facts.position();
                    if (!scope.clear(land, point)) return;
                    if (!hurt(current, enemy, "meteormash", shock, { damage: damageSpec("meteormash", "shock") })) return;
                    hits++;
                    const away = point.minus(land);
                    if (scope.valid(enemy) && away.length() > 0.05)
                        scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                    WorldFeedback.emit(scope, meteormashScene, 1, point,
                        { moment: "hit", target: String(enemy.ref()), flare: flare, scale: scale,
                          intensity: Math.max(0.5, Math.min(2.4, shock / 60)) }, 22);
                });
                if (contact !== null) {
                    const ground = scope.block(land);
                    WorldFeedback.emit(scope, meteormashScene, 1, land,
                        { moment: "crash", flare: flare, hits: hits, block: ground === null ? "" : String(ground.id()), face: face,
                          scorch: scorch, scorchTicks: scorchTicks, scale: scale,
                          intensity: hits > 0 ? Math.max(0.7, intensity) : 0.8 }, 34);
                    sound(current, "minecraft:entity.generic.explode");
                    sound(current, "minecraft:item.mace.smash_ground");
                }
                if (hits > 0) {
                    WorldFeedback.text(scope, land.plus(WorldCombat.point(0, 1.3, 0)), meteormashHitText, [hits], 26);
                    if (scope.random() < chance && scope.valid(actor)) {
                        const gained = NativeEffects.boost(scope, actor, "atk", stages);
                        if (gained > 0) {
                            const me = scope.observe(actor);
                            const at = me === null ? land : me.position();
                            WorldFeedback.emit(scope, meteormashScene, 1, at,
                                { moment: "surge", target: String(actor.ref()), stages: gained, flare: flare, scale: scale }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, me === null ? 1.4 : me.height() + 0.1, 0)),
                                meteormashSurgeText, [gained], 30);
                            scope.sound("minecraft:block.anvil.land", at, 18, "{}");
                        }
                    }
                } else {
                    if (contact === null) {
                        WorldFeedback.emit(scope, meteormashScene, 1, land, { moment: "miss", flare: flare, scale: scale }, 20);
                        WorldFeedback.text(scope, land.plus(WorldCombat.point(0, 0.9, 0)), meteormashMissText, [], 22);
                    } else {
                        WorldFeedback.text(scope, land.plus(WorldCombat.point(0, 1.1, 0)), meteormashMissText, [], 22);
                    }
                }
                finish(current);
            }

            /** 由前上方到前下方分 `sweep` 刻扫下；真实首个接触决定落点，空拳在末端只拖星尾。 */
            function smashAt(current: CombatAction, tick: number, from: CombatPoint, upStart: CombatPoint, downEnd: CombatPoint): void {
                const t = Math.min(1, (tick + 1) / sweep);
                const tip = upStart.plus(downEnd.minus(upStart).scale(t));
                scenes.show(current, "smash", tip,
                    { moment: "smash", path: [[from.x(), from.y(), from.z()], [tip.x(), tip.y(), tip.z()]],
                      flare: flare, scale: scale, intensity: intensity });
                const contact = current.trace(from, tip, fist, true);
                if (contact.hitEntity() || contact.blocked()) { strike(current, contact, tip); return; }
                if (tick + 1 >= sweep) { strike(current, null, tip); return; }
                current.after(1, function (next: CombatAction) { smashAt(next, tick + 1, tip, upStart, downEnd); });
            }

            function smash(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                scenes.stop(current, "charge");
                if (self === null) { finish(current); return; }
                const base = self.position(), height = self.height();
                const upStart = base.plus(heading.scale(0.15)).plus(WorldCombat.point(0, height * 0.75, 0));
                const downEnd = base.plus(heading.scale(forward)).plus(WorldCombat.point(0, -height * 0.35, 0));
                smashAt(current, 0, upStart, upStart, downEnd);
            }

            function charge(current: CombatAction, remaining: number): void {
                const scope = current.world();
                if (remaining <= 0.05) { smash(current); return; }
                const swept = sweepStep(current, heading.scale(Math.min(0.85, remaining)), bodyRadius);
                if (swept.hit.hitEntity() || swept.hit.blocked() || swept.moved < 0.05) { smash(current); return; }
                const self = scope.observe(actor);
                if (self !== null)
                    scenes.show(current, "charge", self.position(), { moment: "charge", flare: flare, scale: scale });
                current.after(1, function (next: CombatAction) { charge(next, remaining - swept.moved); });
            }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, meteormashScene, 1, start,
                { moment: "windup", flare: flare, scale: scale, intensity: intensity }, 16);
            if (approach > 0.05) charge(action, approach); else smash(action);
        }
    });
}
