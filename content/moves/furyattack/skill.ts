/**
 * 乱击 / furyattack —— 出手方式。
 *
 * 核心念头：**原地定点突刺**——施法者扎住脚步，用角或喙朝同一个点一下一下地戳；每一刺把对手顶退一点。
 *   贴着墙或被杀招逼住的目标躲不开会被整串吃满；站在空地上的会被一路顶出射程，后面的刺就都戳在空处。
 *
 * 幕：
 *   起（lower，提交前）：低头压角、脚下扎稳，角尖聚起一线光；`action.present`，可打断、不花 PP。
 *   刺（thrust，提交后）：提交那刻锁死一条准线（`NativeSemantics.aim` 一次性挂上原生 85% 的偏角），每刺同轴。
 *       每一刺先按真实方块射线把角尖截在墙前，再沿这条窄走廊用真实身体箱取**最近的前沿**：至多 `maxTargets`
 *       个并排的非友方各吃一记 `jab`，随后被顶退 `push` 格；前排的身体挡住后排，一刺不会穿透到身后第二排。
 *       每刺都独立掷 `accuracy`——点敌人和只给方向起手走同一套规则；空点也可能失手而整串结束。
 *       锁定的目标走开不算中断：那一刺只是真的戳在空处，后面的刺照常沿锁定准线刺出。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体，也可只给一个方向起手；命中权限仍由命中层判定。
 *   收（settle）：这一串刺完收势，余尘落定。
 *
 * 表现：每刺由自定义场景 `world_combat:move_furyattack_horn` 画一根短角影从身前往返到真实接触点，
 *   余光不长于两刺间隔，不再铺一条平面走廊。
 *
 * 配置 `close`（追击式）由 resolve 改时序、由公式改威力／顶退／追步与命中面；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: furyattackId,
        cooldownParameter: "recharge",
        name: "Fury Attack",
        description: "站定用角或喙朝一点连续突刺：每一刺把对手顶退，退到够不着的地方后面的刺就都戳空。每一刺各自掷命中，点敌人或只给方向起手走同一套规则；前排的身体会挡住后排。顶退式站定不动、一路把人推出射程；追击式向前跟住，把整串吃满。",
        uses: ["站定用角喙朝一点连续突刺", "每一刺把对手顶退，一路把它推出射程", "追击式跟住走位，把整串吃满", "只朝一个方向起手，空刺也照同一套规则前进"],
        kind: "aim",
        range: 2.9,
        maxRange: 4.3,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 200,
        style: "thrust",
        defaults: { close: false, ai: { maxChase: 7, corner: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[furyattackId], detail: { values: config } };
            return { radius: p(furyattackId, "reach", context), geometry: "line", style: "thrust", color: 0xFFE9A8,
                label: config && config.close === true ? "乱击·追击式" : "乱击·顶退式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[furyattackId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(furyattackId, "tempo", context)),
                recover: Math.round(p(furyattackId, "settle", context)),
                cooldown: Math.round(p(furyattackId, "recharge", context)),
                active: 0,
                range: p(furyattackId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            const jabs = Math.max(2, Math.min(5, Math.round(p(furyattackId, "jabs", action))));
            const sparks = Math.max(6, Math.round(p(furyattackId, "sparks", action)));
            action.present("furyattack:lower:" + action.id(), furyattackScene, 1, action.origin(),
                JSON.stringify({ moment: "lower", jabs: jabs, sparks: sparks, windup: prepare,
                    close: config && config.close === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const power = p(furyattackId, "jab", action);
            const jabs = Math.max(2, Math.min(5, Math.round(p(furyattackId, "jabs", action))));
            const gap = Math.max(2, Math.round(p(furyattackId, "gap", action)));
            const reach = p(furyattackId, "reach", action);
            const half = p(furyattackId, "tipWidth", action);
            const push = p(furyattackId, "push", action);
            const step = p(furyattackId, "step", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(furyattackId, "accuracy", action)));
            const sparks = Math.max(8, Math.round(p(furyattackId, "sparks", action)));
            const cap = Math.max(1, Math.round(p(furyattackId, "maxTargets", action)));
            const close = !!(config && config.close === true);
            const band = { below: 1.0, above: 1.9 };
            const scale = Math.max(0.5, Math.min(1.8, half / 0.38));
            const intensity = Math.max(0.5, Math.min(2.4, power / 18));
            // 提交那刻锁死一条准线；每刺同轴，不再随目标转身。命中 85 的偏角只在这一刻挂上。
            const heading = NativeSemantics.aim(action, move,
                WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction()), 1.3);
            const facing = WorldGeometry.flatUnit(heading);
            // 前排身体挡住后排：只有与最近接触点并排的躯体才算进同一刺。
            const abreast = Math.max(0.55, half + 0.35);
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, furyattackScene, 1, at,
                    { moment: "settle", jabs: jabs, landed: landed, sparks: sparks, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), furyattackTallyText, [landed], 22);
                finish(current);
            }

            function thrust(current: CombatAction): void {
                if (settled) return;
                if (index >= jabs) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const shot = index + 1;
                // 真实方块射线把角尖截在墙前；墙后的人不再被算进这一刺。
                const wall = WorldGeometry.blockHit(scope, origin, origin.plus(heading.scale(reach)));
                const length = wall !== null ? Math.max(0.1, Math.min(reach, wall.position().minus(origin).length())) : reach;
                const endpoint = origin.plus(heading.scale(length));
                // 点地与点实体同一套命中规则：每一刺都独立掷一次命中率。
                const missed = scope.random() > accuracy;
                let hits = 0, contact = endpoint;
                if (!missed && length > 0.01) {
                    const candidates: { actor: CombatActor; at: CombatPoint; along: number }[] = [];
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodyLane(origin, facing, length, half, band),
                        function (other, facts) {
                            if (String(other.ref()) === actorRef || facts.friendly()) return;
                            if (!scope.clear(origin, facts.position())) return;
                            const near = scope.closestPoint(other, origin);
                            candidates.push({ actor: other, at: near, along: near.minus(origin).length() });
                        });
                    candidates.sort(function (a, b) { return a.along - b.along; });
                    const front = candidates.length > 0 ? candidates[0].along : 0;
                    // 只取前沿那一排：并排的可一起挨刺，直接落在身后的被前排挡住。
                    for (let i = 0; i < candidates.length && hits < cap; i++) {
                        if (i > 0 && candidates[i].along > front + abreast) break;
                        const other = candidates[i].actor;
                        if (!hurt(current, other, furyattackId, power, { damage: damageSpec(furyattackId, "jab"), contact: true })) continue;
                        hits++; landed++;
                        if (hits === 1) contact = candidates[i].at;
                        if (scope.valid(other)) scope.hitDisplace(other, facing.scale(push));
                        const at = candidates[i].at;
                        WorldFeedback.emit(scope, furyattackScene, 1, at,
                            { moment: "hit", target: String(other.ref()), index: shot, jabs: jabs, sparks: sparks,
                                push: Math.round(push * 100) / 100, scale: scale, intensity: intensity }, 20);
                        scope.sound("cobblemon:impact.fighting", at, 14, "{}");
                    }
                }
                // 每刺即时一根短角影往返到真接触点；余光不长于两刺间隔，不铺平面地毯。
                const trip = Math.max(2, Math.min(gap, 5));
                WorldFeedback.emit(scope, furyattackHornScene, 1, origin,
                    { moment: "horn", origin: [origin.x(), origin.y(), origin.z()],
                        contact: [contact.x(), contact.y(), contact.z()], direction: [heading.x(), heading.y(), heading.z()],
                        start: scope.tick(), trip: trip, reach: length, index: shot, jabs: jabs,
                        sparks: sparks, scale: scale, intensity: intensity, miss: missed ? 1 : 0 }, trip + 4);
                sound(current, "minecraft:entity.player.attack.weak");
                if (missed) {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyattackMissText, [shot], 20);
                    settle(current);
                    return;
                }
                index = shot;
                // 追击式：把距离重新压回射程内；走原生可达位移，撞墙则照实停住。
                if (close && step > 0.05) scope.displace(actor, facing.scale(step));
                if (index >= jabs) { settle(current); return; }
                current.after(gap, thrust);
            }

            sound(action, "cobblemon:move.horndrill.target_1");
            WorldFeedback.emit(world, furyattackScene, 1, action.origin(),
                { moment: "lower", jabs: jabs, sparks: sparks, scale: scale, intensity: intensity }, 16);
            thrust(action);
        }
    });
}
