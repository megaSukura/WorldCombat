/**
 * 鳞射 / scaleshot 的出手方式。本族「拆甲换力」的连射型。
 *
 * 核心念头：**一梭脱鳞**——抖开背鳞，鳞片一片接一片沿准线射向目标；每片削掉一点护壳，这梭打完身上轻了
 *   （速度 +1）但也露了底（防御 −1）。卖的是「用脱甲换机动」。
 *
 * 三幕（提交前只播预告）：
 *   起（shake）：抖身，背鳞竖起、边缘亮起，只播预告。
 *   射（volley → hit / husk）：提交后每 `gap` 刻射出一片鳞（带 `spread` 偏角），鳞片朝目标修正；
 *       命中非友方结算一次 `shard` 物理伤害、崩出鳞屑；落在硬面只留一小撮碎屑。发数 `shots`（2～5）。
 *       散鳞式（配置 spray）把鳞片轮流分给身前锥形内至多 `maxTargets` 个敌人。
 *   脱（shed）：这一梭射完（或目标全部倒下）后自身速度 +`speedGain`、防御 −`guardLoss`，浮字提示。
 *
 * 与同族分开：蛮力是近身单体最重的一击、砸地留坑、自身攻防双降；火焰鞭是长鞭剥对手甲；鳞片噪音是环身特殊声爆；
 *   鳞射是**远距 2～5 段小撞击，打完自身提速降防**，本族唯一会加速的招式。
 *
 * 配置 `spray` 由公式改威力／射程／散布／时序，由本文件改目标分配；提交后才触碰世界。
 */
namespace PokemonSkills {
    const scaleshotScene = "world_combat:move_scaleshot";
    const scaleshotShedText = "world_combat.move.scaleshot.text.shed";
    const scaleshotMissText = "world_combat.move.scaleshot.text.miss";

    define({
        id: "scaleshot",
        cooldownParameter: "recharge",
        name: "Scale Shot",
        description: "抖开背鳞，鳞片一片接一片射向目标，连续削 2～5 次；这一梭打完自身速度 +1 级、防御 −1 级。散鳞式把鳞片分给身前一群敌人，单发更轻、露底更多。",
        uses: ["中远距离一梭鳞片连续削目标", "用一梭小撞击把速度拉起来接下一手", "散鳞式把鳞片分给身前一群敌人"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        maximumTicks: 260,
        style: "shard",
        defaults: { spray: false, ai: { maxChase: 10, spread: false, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("scaleshot", "reach", pokemon) : 8,
                geometry: config && config.spray === true ? "cone" : "line", style: "shard",
                color: 0x7C8CE8, label: config && config.spray === true ? "鳞射·散鳞式" : "鳞射·聚鳞式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["scaleshot"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("scaleshot", "tempo", context)),
                recover: Math.round(p("scaleshot", "aftercast", context)),
                cooldown: Math.round(p("scaleshot", "recharge", context)),
                active: 0,
                range: p("scaleshot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_scaleshot:shake", scaleshotScene, 1, action.origin(),
                JSON.stringify({ moment: "shake", spray: config && config.spray === true ? 1 : 0,
                    shots: Math.round(p("scaleshot", "shots", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const origin = action.origin();
            const aiming = aim(action);
            const power = p("scaleshot", "shard", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("scaleshot", "shots", action))));
            const gap = Math.max(2, Math.round(p("scaleshot", "gap", action)));
            const shardSpeed = Math.max(0.6, p("scaleshot", "shardSpeed", action));
            const spread = Math.max(1, p("scaleshot", "spread", action));
            const reach = p("scaleshot", "reach", action);
            const shardRadius = Math.max(0.12, p("scaleshot", "shardRadius", action));
            const speedGain = Math.max(0, Math.round(p("scaleshot", "speedGain", action)));
            const guardLoss = Math.max(0, Math.round(p("scaleshot", "guardLoss", action)));
            const maxTargets = Math.max(1, Math.round(p("scaleshot", "maxTargets", action)));
            const spray = !!(config && config.spray);
            const scale = Math.max(0.6, Math.min(1.8, shardRadius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            const shards = Math.round(6 + power * 0.5);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            let resolved = 0;

            /** 脱鳞：这一梭打完把速度抬起来、防御降下去；这是使用本招的固定代价与收益。 */
            function shed(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                NativeEffects.boost(scope, actor, "spe", speedGain);
                NativeEffects.boost(scope, actor, "def", -guardLoss);
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, scaleshotScene, 1, at,
                    { moment: "shed", speedGain: speedGain, guardLoss: guardLoss, shards: shards,
                        shed: Math.round(8 + shards * 0.6), intensity: intensity, scale: scale }, 24);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), scaleshotShedText, [speedGain, guardLoss], 30);
                sound(current, "cobblemon:move.dragonclaw.target");
                finish(current);
            }

            if (target === null || !world.valid(target)) {
                WorldFeedback.emit(world, scaleshotScene, 1, origin,
                    { moment: "husk", shards: Math.round(shards * 0.5), intensity: intensity, scale: scale }, 14);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), scaleshotMissText, [], 22);
                shed(action); return;
            }
            const startRef = String(target.ref());
            const refs: string[] = [];
            if (spray) {
                refs.push(startRef);
                WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, aiming, reach, 70, { below: 2, above: 3 }),
                    function (other) {
                        const ref = String(other.ref());
                        if (ref !== startRef && refs.length < maxTargets) refs.push(ref);
                    });
            } else {
                refs.push(startRef);
            }

            /** 射出一片鳞：优先选一名还活着的目标，鳞片朝它修正；落定后计数，全部落定即脱鳞。 */
            function launch(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                let ref: string | null = null;
                for (let k = 0; k < refs.length; k++) {
                    const candidate = refs[(index + k) % refs.length];
                    const actorRef = scope.actor(candidate);
                    if (actorRef !== null && scope.valid(actorRef)) { ref = candidate; break; }
                }
                const victim = ref !== null ? scope.actor(ref) : null;
                const vbody = victim !== null ? scope.observe(victim) : null;
                if (self === null || ref === null || vbody === null) {
                    resolved++;
                    if (resolved >= shots) shed(current);
                    return;
                }
                let heading = vbody.position().minus(self.position());
                if (heading.length() < 0.05) heading = aiming;
                heading = heading.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, 0,
                    heading.x() * sin + heading.z() * cos);
                const shot = index + 1;
                sound(current, "minecraft:entity.arrow.shoot");
                const flight = LivingActions.projectile(current, {
                    speed: shardSpeed, range: current.range() + 1.5, radius: shardRadius, direction: direction, gravity: 0,
                    lifetime: Math.max(20, Math.round((current.range() + 1.5) / Math.max(0.2, shardSpeed) + 8)),
                    appearance: { sprite: "cobblemon:generic/spike", tint: 0x7C8CE8, glow: true,
                        scale: Math.max(0.6, Math.min(1.6, shardRadius * 2.6)),
                        homing: { target: ref, turn: 5, delay: 0, range: reach + 3 } },
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        const scope2 = inner.world(), pnt = hit.position(), v = hit.target();
                        if (v !== null && scope2.valid(v) && !scope2.friendly(v)) {
                            if (!impact(inner, hit, "scaleshot", power, { damage: damageSpec("scaleshot", "shard") }, "shard" + shot)) return;
                            WorldFeedback.emit(scope2, scaleshotScene, 1, pnt,
                                { moment: "hit", target: String(v.ref()), shot: shot, shots: shots,
                                    shards: shards, intensity: intensity, scale: scale }, 18);
                            sound(inner, "cobblemon:impact.dragon");
                        } else {
                            WorldFeedback.emit(scope2, scaleshotScene, 1, pnt,
                                { moment: "husk", shot: shot, shots: shots,
                                    shards: Math.round(shards * 0.5), intensity: Math.max(0.4, intensity * 0.7), scale: scale }, 14);
                        }
                    }
                }, function (inner: CombatAction) {
                    resolved++;
                    if (resolved >= shots) shed(inner);
                });
                WorldFeedback.keep(scope, "scaleshot:shot:" + current.id() + ":" + shot, scaleshotScene, 1, self.position(),
                    { moment: "volley", projectile: flight, shot: shot, shots: shots, shards: shards,
                        intensity: intensity, scale: scale, direction: [direction.x(), direction.y(), direction.z()] }, 40);
            }

            sound(action, "cobblemon:move.dragonclaw.actor");
            WorldFeedback.emit(world, scaleshotScene, 1, origin,
                { moment: "shake", shots: shots, shards: shards, intensity: intensity, scale: scale, spray: spray ? 1 : 0 }, 14);
            // 一梭连发：第一片立即射出，之后每 `gap` 刻一片；鳞片各自落定，全部落定后脱鳞。
            for (let i = 0; i < shots; i++) {
                if (i === 0) launch(action, 0);
                else action.after(i * gap, function (next: CombatAction) { launch(next, i); });
            }
            action.after(shots * gap + 120, function (next: CombatAction) { if (!settled) shed(next); });
        }
    });
}

