/**
 * 百万吨重拳 / megapunch 的出手方式。
 *
 * 核心念头：**一记灌注全身质量的正拳，沿瞄准方向把落在拳路里的东西整块推出去**——不是连拳（迷昏拳），
 * 不是横扫（爆裂拳），是一支活塞。它不带任何元素状态，身份全在**质量与直线**：站在拳路里就吃，侧身就让开；
 * 吃中的人被沿同一条线推飞，推得多远取决于施法者有多重、目标有多大。
 *
 * 拳路是**三维**的：从身体中心沿瞄准方向伸出 `fistReach` 的一条窄管，可向上出拳；`WorldGeometry.bodySegment`
 * 只选身体真正与这条窄管相交的目标，落在拳路上方的飞行目标不会被旧的地面高盒扫中。实墙由方块射线裁剪，
 * 拳路停在真实方块格与表面上；伤害仍对每个被选中的非友方单独结算。
 *
 * 三幕：
 *   起（windup，提交前）：收拳沉腰、后脚蹬地，只播预告。
 *   击（thrust）：提交后沿瞄准方向推出拳路；拳路里的每个非友方各吃一记 megaton 接触+拳伤害。
 *   收：命中的人被沿同一条线分段推开 `shove`（每名实体按自身实际上下文算），实际推不动的人不再重发 launch，
 *       但拳伤照样成立；一个人都没打中只留一拳破风或砸墙。
 *
 * 配置 `planted`（扎根式）由 resolve 改时序、由公式改威力与击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const megapunchScene = "world_combat:move_megapunch";
    const megapunchHitText = "world_combat.move.megapunch.text.hit";
    const megapunchWallText = "world_combat.move.megapunch.text.wall";
    const megapunchMissText = "world_combat.move.megapunch.text.miss";

    /** 每名受击者按自身实际上下文（施法者体重、目标体型）算出的推开距离；不依赖提交时选中的那一个。 */
    function megapunchShove(action: CombatAction, victim: CombatActor): number {
        return Math.max(0, p("megapunch", "shove", withTarget(factContext(action), victim)));
    }

    define({
        id: "megapunch",
        cooldownParameter: "recharge",
        name: "Mega Punch",
        description: "收拳沉腰蓄势，沿瞄准方向打出一记灌注全身质量的重拳：拳路是一条停在实墙前的三维窄道，落在拳路里的每个目标都吃这一记，并被沿同一条线整块推开。侧身站开或走出拳路就能让这一拳落空。",
        uses: ["在拳路内打一记定音重拳", "把正面的目标整块推离原位", "对站桩的目标打一发最重的单体伤害"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.2,
        prepare: 9,
        active: 18,
        recover: 11,
        cooldown: 42,
        style: "punch",
        defaults: { planted: false, ai: { maxChase: 5, preferWounded: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megapunch", "fistReach", pokemon) + 0.3, geometry: "line", style: "punch", color: 0xC9B37A,
                label: config && config.planted === true ? "扎根重拳" : "百万吨重拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["megapunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megapunch", "wind", context)),
                recover: Math.round(p("megapunch", "brace", context)),
                cooldown: Math.round(p("megapunch", "recharge", context)),
                active: skills["megapunch"].active,
                range: p("megapunch", "fistReach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_megapunch:windup", megapunchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const me = world.observe(actor);
            if (me === null) { done(action); return; }
            const direction = aim(action);
            const reach = p("megapunch", "fistReach", action);
            const bore = p("megapunch", "bore", action);
            const power = p("megapunch", "megaton", action);
            const rings = Math.max(2, Math.round(p("megapunch", "rings", action)));
            const scale = reach / 2.3;
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const flows = Math.max(40, Math.round(90 + rings * 14 + bore * 40));
            const perStep = 0.55;
            const start = me.position();
            const rawEnd = start.plus(direction.scale(reach));
            // 实墙裁拳路：方块射线给出原生命中格与表面，拳路停在墙前，不隔墙打人。
            const wall = world.clipBlocks(start, rawEnd);
            const walled = wall !== null && wall.blocked();
            const stop = walled ? wall!.position() : rawEnd;
            const travel = stop.minus(start).length();
            const pending: { ref: string; remaining: number }[] = [];
            let settled = false, anyWall = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function launch(current: CombatAction, index: number): void {
                const scope = current.world(), next: { ref: string; remaining: number }[] = [];
                for (let i = 0; i < pending.length; i++) {
                    const entry = pending[i];
                    const victim = scope.actor(entry.ref);
                    if (victim === null || !scope.valid(victim)) continue;
                    const amount = Math.min(perStep, entry.remaining);
                    if (amount <= 0.001) continue;
                    const moved = scope.displace(victim, direction.scale(amount));
                    entry.remaining -= moved;
                    // 实际推不动（抗击退 Boss 等）就不再重发；重拳伤害已经成立。
                    if (moved <= 0.001) continue;
                    const body = scope.observe(victim);
                    if (body !== null) WorldFeedback.emit(scope, megapunchScene, 1, body.position(),
                        { moment: "launch", target: entry.ref, scale: scale, intensity: intensity }, 14);
                    if (entry.remaining > 0.05) next.push(entry);
                }
                pending.length = 0;
                for (let j = 0; j < next.length; j++) pending.push(next[j]);
                if (index === 0) sound(current, "minecraft:entity.player.attack.knockback");
                if (pending.length === 0 || index > 12) { finish(current); return; }
                current.after(1, function (later: CombatAction) { launch(later, index + 1); });
            }

            if (travel >= 0.05) {
                // 权威首碰（实体或方块），与拳路终点共用同一组位置数据。
                const contact = action.trace(start, stop, bore, true);
                if (contact.blocked() && !contact.hitEntity()) anyWall = true;
                WorldFeedback.emit(world, megapunchScene, 1, start,
                    { moment: "thrust", path: [[start.x(), start.y(), start.z()], [stop.x(), stop.y(), stop.z()]],
                        direction: [direction.x(), direction.y(), direction.z()],
                        rings: rings, flows: flows, scale: scale, intensity: intensity }, 18);
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(start, stop, bore), function (victim, facts) {
                    if (String(victim.ref()) === String(actor.ref()) || world.friendly(victim)) return;
                    if (!hurt(action, victim, "megapunch", power,
                        { damage: damageSpec("megapunch", "megaton"), contact: true, punch: true })) return;
                    pending.push({ ref: String(victim.ref()), remaining: Math.min(2.0, megapunchShove(action, victim)) });
                    WorldFeedback.emit(world, megapunchScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), scale: scale, intensity: intensity }, 22);
                });
            }
            if (walled) {
                const cell = wall!.blockPosition() || wall!.position();
                WorldFeedback.emit(world, megapunchScene, 1, cell,
                    { moment: "wall", scale: scale, intensity: intensity }, 18);
                anyWall = true;
            }

            if (pending.length === 0) {
                if (!anyWall) {
                    WorldFeedback.emit(world, megapunchScene, 1, start, { moment: "whiff", scale: scale, intensity: intensity }, 18);
                    WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.3, 0)), megapunchMissText, [], 22);
                    sound(action, "minecraft:entity.player.attack.weak");
                } else {
                    WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.3, 0)), megapunchWallText, [], 22);
                }
                finish(action);
                return;
            }
            sound(action, "minecraft:entity.player.attack.strong");
            sound(action, "cobblemon:impact.fighting");
            WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.3, 0)), megapunchHitText, [pending.length], 24);
            launch(action, 0);
        }
    });
}
